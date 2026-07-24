#include <Arduino.h>
#include <Preferences.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <mqtt_client.h>

#include <array>
#include <cstring>
#include <ctime>

#include "gateway_config.hpp"
#include "gateway_core/boot_counter.hpp"
#include "gateway_core/bounded_queue.hpp"
#include "gateway_core/gateway_core.hpp"
#include "gateway_core/mqtt_policy.hpp"
#include "gateway_core/outbox.hpp"
#include "gateway_core/readiness.hpp"
#include "mqtt_serialization.hpp"
#include "smart_campus/protocol_limits.hpp"

namespace {

using smart_campus::MacAddress;
using smart_campus::NodeId;

struct RawFrame {
  MacAddress source{};
  std::uint16_t length{0};
  std::uint32_t arrival_monotonic_ms{0};
  std::array<std::uint8_t, smart_campus::kMaxWireBytes> bytes{};
};

gateway_core::BoundedQueue<RawFrame, smart_campus::kGatewayReceiveQueueCapacity>
    receive_queue;
portMUX_TYPE receive_mux = portMUX_INITIALIZER_UNLOCKED;

const MacAddress node_1_mac SC_NODE_1_MAC_BYTES;
const MacAddress node_2_mac SC_NODE_2_MAC_BYTES;
const MacAddress node_3_mac SC_NODE_3_MAC_BYTES;

const std::array<gateway_core::Peer, 3> peers{{
    {NodeId::NODE_1, node_1_mac, SC_FIELD_ENCRYPTION_ENABLED != 0},
    {NodeId::NODE_2, node_2_mac, SC_FIELD_ENCRYPTION_ENABLED != 0},
    {NodeId::NODE_3, node_3_mac, SC_FIELD_ENCRYPTION_ENABLED != 0},
}};

gateway_core::PeerRegistry registry(
#if SC_FIELD_ENCRYPTION_ENABLED
    gateway_core::DeploymentMode::FIELD,
#else
    gateway_core::DeploymentMode::LAB,
#endif
    peers);
gateway_core::GatewayCore core(registry);
gateway_core::Outbox outbox;
gateway_core::Readiness readiness;

esp_mqtt_client_handle_t mqtt_client = nullptr;
String gateway_boot_id;
String last_will_json;
std::uint32_t last_wifi_attempt_ms = 0;
std::uint32_t last_mqtt_attempt_ms = 0;
std::uint32_t last_utc_attempt_ms = 0;
bool mqtt_started = false;

class PreferencesBootCounterStore : public gateway_core::BootCounterStore {
 public:
  bool read(const char* name_space, const char* key, std::uint32_t& value) override {
    Preferences preferences;
    if (!preferences.begin(name_space, true)) return false;
    value = preferences.getUInt(key, 0);
    preferences.end();
    return true;
  }

  bool write(const char* name_space, const char* key, std::uint32_t value) override {
    Preferences preferences;
    if (!preferences.begin(name_space, false)) return false;
    const std::size_t written = preferences.putUInt(key, value);
    preferences.end();
    return written == sizeof(value);
  }
};

std::uint64_t epoch_ms_now() {
  timeval now{};
  gettimeofday(&now, nullptr);
  return static_cast<std::uint64_t>(now.tv_sec) * 1000ULL +
         static_cast<std::uint64_t>(now.tv_usec / 1000);
}

bool utc_ready() {
  return std::time(nullptr) >= 1577836800;
}

void safe_log(const char* message) {
  Serial.println(message);
}

void IRAM_ATTR on_esp_now_receive(const std::uint8_t* source,
                                  const std::uint8_t* bytes, int length) {
  if (source == nullptr || bytes == nullptr || length <= 0 ||
      length > static_cast<int>(smart_campus::kMaxWireBytes))
    return;
  RawFrame frame{};
  std::memcpy(frame.source.data(), source, frame.source.size());
  frame.length = static_cast<std::uint16_t>(length);
  frame.arrival_monotonic_ms = millis();
  std::memcpy(frame.bytes.data(), bytes, static_cast<std::size_t>(length));
  portENTER_CRITICAL_ISR(&receive_mux);
  receive_queue.push(frame);
  portEXIT_CRITICAL_ISR(&receive_mux);
}

bool add_peer(const gateway_core::Peer& peer, const std::uint8_t* lmk) {
  esp_now_peer_info_t info{};
  std::memcpy(info.peer_addr, peer.mac.data(), peer.mac.size());
  info.channel = gateway_config::kCommunicationChannel;
  info.ifidx = WIFI_IF_STA;
  info.encrypt = peer.encrypted;
  if (peer.encrypted && lmk != nullptr) std::memcpy(info.lmk, lmk, ESP_NOW_KEY_LEN);
  return esp_now_add_peer(&info) == ESP_OK;
}

bool initialize_esp_now() {
  if (!registry.valid()) return false;
  std::uint8_t primary = 0;
  wifi_second_chan_t secondary = WIFI_SECOND_CHAN_NONE;
  if (esp_wifi_get_channel(&primary, &secondary) != ESP_OK ||
      primary != gateway_config::kCommunicationChannel) {
    readiness.channel_aligned = false;
    return false;
  }
  readiness.channel_aligned = true;
  if (esp_now_init() != ESP_OK) return false;
  if (esp_now_register_recv_cb(on_esp_now_receive) != ESP_OK) return false;

#if SC_FIELD_ENCRYPTION_ENABLED
  const std::uint8_t pmk[ESP_NOW_KEY_LEN] = SC_ESPNOW_PMK_BYTES;
  const std::uint8_t lmk_1[ESP_NOW_KEY_LEN] = SC_NODE_1_LMK_BYTES;
  const std::uint8_t lmk_2[ESP_NOW_KEY_LEN] = SC_NODE_2_LMK_BYTES;
  const std::uint8_t lmk_3[ESP_NOW_KEY_LEN] = SC_NODE_3_LMK_BYTES;
  if (esp_now_set_pmk(pmk) != ESP_OK || !add_peer(peers[0], lmk_1) ||
      !add_peer(peers[1], lmk_2) || !add_peer(peers[2], lmk_3))
    return false;
#else
  if (!add_peer(peers[0], nullptr) || !add_peer(peers[1], nullptr) ||
      !add_peer(peers[2], nullptr))
    return false;
#endif
  readiness.peers_registered = true;
  return true;
}

void publish_birth() {
  if (mqtt_client == nullptr || !readiness.online()) return;
  char timestamp[32]{};
  if (!gateway_mqtt::format_utc(epoch_ms_now(), timestamp, sizeof(timestamp))) return;
  String json;
  if (!gateway_mqtt::serialize_status(gateway_boot_id.c_str(), "ONLINE", millis(),
                                      gateway_config::kCommunicationChannel,
                                      timestamp, json))
    return;
  esp_mqtt_client_publish(mqtt_client, gateway_config::kStatusTopic, json.c_str(),
                          json.length(), smart_campus::kMqttQos, 1);
}

void on_mqtt_event(void*, esp_event_base_t, std::int32_t event_id, void* event_data) {
  const auto event = static_cast<esp_mqtt_event_handle_t>(event_data);
  switch (static_cast<esp_mqtt_event_id_t>(event_id)) {
    case MQTT_EVENT_CONNECTED:
      readiness.mqtt_connected = true;
      publish_birth();
      break;
    case MQTT_EVENT_DISCONNECTED:
      readiness.mqtt_connected = false;
      outbox.release_unacknowledged();
      break;
    case MQTT_EVENT_PUBLISHED:
      if (event != nullptr && event->msg_id > 0)
        outbox.acknowledge(static_cast<std::uint32_t>(event->msg_id));
      break;
    case MQTT_EVENT_ERROR:
      if (event == nullptr || event->error_handle == nullptr) {
        safe_log("gateway: MQTT connection failed");
      } else if (event->error_handle->esp_tls_cert_verify_flags != 0) {
        safe_log("gateway: MQTT TLS certificate verification failed");
      } else if (event->error_handle->error_type ==
                 MQTT_ERROR_TYPE_CONNECTION_REFUSED) {
        safe_log("gateway: MQTT broker rejected the connection");
      } else {
        safe_log("gateway: MQTT TLS or transport connection failed");
      }
      break;
    default:
      break;
  }
}

bool start_mqtt() {
  if (mqtt_started) return true;
  if (!readiness.wifi_connected || !readiness.channel_aligned ||
      !readiness.esp_now_ready || !readiness.peers_registered ||
      !readiness.utc_ready)
    return false;
  const gateway_core::MqttPolicyResult policy =
      gateway_core::validate_mqtt_policy(
          {gateway_config::kMqttDeploymentProfile, SC_MQTT_URI, SC_MQTT_USERNAME,
           SC_MQTT_PASSWORD, gateway_config::kMqttCaCertificatePem});
  if (!policy) {
    safe_log(gateway_core::mqtt_policy_error_message(policy.error));
    return false;
  }
  char timestamp[32]{};
  if (!gateway_mqtt::format_utc(epoch_ms_now(), timestamp, sizeof(timestamp))) return false;
  if (!gateway_mqtt::serialize_status(gateway_boot_id.c_str(), "OFFLINE", millis(),
                                      gateway_config::kCommunicationChannel,
                                      timestamp, last_will_json))
    return false;

  esp_mqtt_client_config_t config{};
  config.uri = SC_MQTT_URI;
  config.client_id = "GW_1";
  config.username = SC_MQTT_USERNAME[0] == '\0' ? nullptr : SC_MQTT_USERNAME;
  config.password = SC_MQTT_PASSWORD[0] == '\0' ? nullptr : SC_MQTT_PASSWORD;
  config.cert_pem =
      policy.tls_enabled ? gateway_config::kMqttCaCertificatePem : nullptr;
  config.cert_len = 0;
  config.lwt_topic = gateway_config::kStatusTopic;
  config.lwt_msg = last_will_json.c_str();
  config.lwt_msg_len = last_will_json.length();
  config.lwt_qos = smart_campus::kMqttQos;
  config.lwt_retain = 1;
  mqtt_client = esp_mqtt_client_init(&config);
  if (mqtt_client == nullptr) return false;
  if (esp_mqtt_client_register_event(mqtt_client, MQTT_EVENT_ANY, on_mqtt_event,
                                     nullptr) != ESP_OK)
    return false;
  if (esp_mqtt_client_start(mqtt_client) != ESP_OK) return false;
  mqtt_started = true;
  return true;
}

void service_connectivity() {
  const std::uint32_t now = millis();
  readiness.wifi_connected = WiFi.status() == WL_CONNECTED;
  if (!readiness.wifi_connected) {
    readiness.channel_aligned = false;
    readiness.esp_now_ready = false;
    readiness.peers_registered = false;
    if (now - last_wifi_attempt_ms >= gateway_config::kWifiRetryMs) {
      last_wifi_attempt_ms = now;
      WiFi.begin(SC_WIFI_SSID, SC_WIFI_PASSWORD);
    }
    return;
  }

  if (!readiness.esp_now_ready) {
    readiness.esp_now_ready = initialize_esp_now();
    if (!readiness.esp_now_ready) return;
  }

  readiness.utc_ready = utc_ready();
  if (!readiness.utc_ready && now - last_utc_attempt_ms >= gateway_config::kUtcRetryMs) {
    last_utc_attempt_ms = now;
    configTime(0, 0, "pool.ntp.org", "time.cloudflare.com");
    return;
  }
  if (readiness.utc_ready && !mqtt_started &&
      now - last_mqtt_attempt_ms >= gateway_config::kMqttRetryMs) {
    last_mqtt_attempt_ms = now;
    start_mqtt();
  }
}

void drain_receive_callback_queue() {
  RawFrame raw{};
  for (;;) {
    portENTER_CRITICAL(&receive_mux);
    const bool available = receive_queue.pop(raw);
    portEXIT_CRITICAL(&receive_mux);
    if (!available) return;
    const auto result =
        core.receive(raw.source, raw.bytes.data(), raw.length, raw.arrival_monotonic_ms);
    if (!result) safe_log("gateway: dropped invalid or unauthorized ESP-NOW frame");
  }
}

void drain_accepted_frames() {
  if (!readiness.utc_ready) return;
  gateway_core::AcceptedFrame frame{};
  while (!outbox.full() && core.pop(frame)) {
    std::uint64_t received_epoch_ms = 0;
    if (!gateway_core::reconstruct_received_epoch_ms(
            epoch_ms_now(), millis(), frame.arrival_monotonic_ms, received_epoch_ms))
      return;
    char received_at[32]{};
    if (!gateway_mqtt::format_utc(received_epoch_ms, received_at, sizeof(received_at)))
      return;
    String topic;
    String payload;
    if (!gateway_mqtt::serialize_envelope(frame, gateway_boot_id.c_str(), received_at,
                                          topic, payload)) {
      safe_log("gateway: rejected frame during bounded JSON serialization");
      continue;
    }
    if (!outbox.enqueue({0, frame.gateway_sequence, frame.message.message_type,
                         topic.c_str(), payload.c_str(), 0, false}))
      return;
  }
}

void service_outbox() {
  if (!readiness.mqtt_connected || mqtt_client == nullptr) return;
  gateway_core::PublishItem* item = outbox.next();
  if (item == nullptr) return;
  const int packet_id =
      esp_mqtt_client_publish(mqtt_client, item->topic.c_str(), item->payload.c_str(),
                              item->payload.size(), smart_campus::kMqttQos, 0);
  if (packet_id > 0)
    outbox.mark_sent(item->gateway_sequence, static_cast<std::uint32_t>(packet_id));
  else
    outbox.mark_rejected(item->gateway_sequence);
}

}  // namespace

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  PreferencesBootCounterStore store;
  const gateway_core::BootCounterResult boot = gateway_core::next_boot_counter(store);
  if (!boot.ok || !registry.valid()) {
    safe_log("gateway: safe halt; boot identity or peer registry invalid");
    return;
  }
  gateway_boot_id = boot.boot_id.c_str();
  configTime(0, 0, "pool.ntp.org", "time.cloudflare.com");
  WiFi.begin(SC_WIFI_SSID, SC_WIFI_PASSWORD);
}

void loop() {
  if (gateway_boot_id.isEmpty()) {
    delay(100);
    return;
  }
  service_connectivity();
  drain_receive_callback_queue();
  drain_accepted_frames();
  service_outbox();
  delay(1);
}
