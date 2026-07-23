#include <Arduino.h>
#include <Preferences.h>
#include <WiFi.h>
#include <esp_arduino_version.h>
#include <esp_idf_version.h>
#include <esp_now.h>
#include <esp_wifi.h>

#include <array>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <limits>

#if SMART_CAMPUS_NODE_ID == 2
#include <Adafruit_INA219.h>
#include <BH1750.h>
#include <Wire.h>
#endif

#include "node_config.hpp"
#include "node_profiles.hpp"
#include "node_version.hpp"
#include "node_core/boot_counter.hpp"
#include "node_core/lighting_controller.hpp"
#include "node_core/node_state.hpp"
#include "node_core/peer_registry.hpp"
#include "node_core/tx_queue.hpp"
#include "smart_campus/wire_codec.hpp"

namespace {

using smart_campus::LampId;
using smart_campus::MacAddress;
using smart_campus::MessageType;
using smart_campus::NodeId;
using smart_campus::SensorEdge;
using smart_campus::SensorId;
using smart_campus::SensorState;
using smart_campus::WireMessage;

constexpr node_profiles::NodeProfile profile =
    node_profiles::kSelectedProfile;
constexpr std::size_t kReceiveCapacity = 8;

const MacAddress gateway_mac SC_GATEWAY_MAC_BYTES;
const MacAddress node_1_mac SC_NODE_1_MAC_BYTES;
const MacAddress node_2_mac SC_NODE_2_MAC_BYTES;
const MacAddress node_3_mac SC_NODE_3_MAC_BYTES;

const MacAddress& mac_for_node(NodeId node) {
  if (node == NodeId::NODE_1) return node_1_mac;
  if (node == NodeId::NODE_2) return node_2_mac;
  return node_3_mac;
}

const MacAddress& selected_mac() {
  return mac_for_node(profile.node_id);
}

std::array<node_core::Peer, 3> make_peers() {
  std::array<node_core::Peer, 3> result{};
  result[0] = {node_core::PeerRole::GATEWAY, profile.node_id, gateway_mac,
               SC_NODE_ENCRYPTION_ENABLED != 0};
  std::size_t index = 1;
  for (std::uint8_t number = 1; number <= 3; ++number) {
    const NodeId node = static_cast<NodeId>(number);
    if (node == profile.node_id) continue;
    result[index++] = {node_core::PeerRole::NODE, node, mac_for_node(node),
                       SC_NODE_ENCRYPTION_ENABLED != 0};
  }
  return result;
}

const std::array<node_core::Peer, 3> peers = make_peers();
node_core::PeerRegistry registry(
#if SC_NODE_ENCRYPTION_ENABLED
    node_core::DeploymentMode::FIELD,
#else
    node_core::DeploymentMode::LAB,
#endif
    peers);

struct RawFrame {
  MacAddress source{};
  std::uint16_t length{0};
  std::array<std::uint8_t, smart_campus::kMaxWireBytes> bytes{};
};

std::array<RawFrame, kReceiveCapacity> receive_items{};
volatile std::size_t receive_head = 0;
volatile std::size_t receive_count = 0;
portMUX_TYPE receive_mux = portMUX_INITIALIZER_UNLOCKED;

node_core::LightingController lighting(profile.node_id);
node_core::SequenceCounter sequence_counter;
node_core::TxQueue tx_queue;
std::array<node_core::DebouncedInput, 2> debouncers{};
std::array<std::uint8_t, 2> last_pwm{{255, 255}};
std::uint32_t boot_counter = 0;
std::uint32_t last_heartbeat_ms = 0;
std::uint32_t last_ambient_ms = 0;
std::uint32_t last_electrical_ms = 0;
bool transmission_ready = false;
bool send_in_flight = false;
volatile bool send_result_ready = false;
volatile bool send_succeeded = false;

#if SMART_CAMPUS_NODE_ID == 2
BH1750 ambient_sensor;
Adafruit_INA219 electrical_sensor;
bool ambient_ready = false;
bool electrical_ready = false;
double energy_mwh = 0.0;
#endif

class PreferencesBootCounterStore : public node_core::BootCounterStore {
 public:
  bool read(const char* name_space, const char* key,
            std::uint32_t& value) override {
    Preferences preferences;
    if (!preferences.begin(name_space, true)) return false;
    value = preferences.getUInt(key, 0);
    preferences.end();
    return true;
  }

  bool write(const char* name_space, const char* key,
             std::uint32_t value) override {
    Preferences preferences;
    if (!preferences.begin(name_space, false)) return false;
    const std::size_t written = preferences.putUInt(key, value);
    preferences.end();
    return written == sizeof(value);
  }
};

void push_received(const std::uint8_t* source, const std::uint8_t* bytes,
                   int length) {
  if (source == nullptr || bytes == nullptr || length <= 0 ||
      length > static_cast<int>(smart_campus::kMaxWireBytes))
    return;
  portENTER_CRITICAL_ISR(&receive_mux);
  if (receive_count < kReceiveCapacity) {
    const std::size_t index =
        (receive_head + receive_count) % kReceiveCapacity;
    std::memcpy(receive_items[index].source.data(), source,
                receive_items[index].source.size());
    receive_items[index].length = static_cast<std::uint16_t>(length);
    std::memcpy(receive_items[index].bytes.data(), bytes,
                static_cast<std::size_t>(length));
    ++receive_count;
  }
  portEXIT_CRITICAL_ISR(&receive_mux);
}

#if ESP_IDF_VERSION_MAJOR >= 5
void on_esp_now_receive(const esp_now_recv_info_t* info,
                        const std::uint8_t* bytes, int length) {
  push_received(info == nullptr ? nullptr : info->src_addr, bytes, length);
}
#else
void on_esp_now_receive(const std::uint8_t* source,
                        const std::uint8_t* bytes, int length) {
  push_received(source, bytes, length);
}
#endif

#if ESP_IDF_VERSION_MAJOR >= 5
void on_esp_now_send(const wifi_tx_info_t*,
                     esp_now_send_status_t status) {
#else
void on_esp_now_send(const std::uint8_t*,
                     esp_now_send_status_t status) {
#endif
  send_succeeded = status == ESP_NOW_SEND_SUCCESS;
  send_result_ready = true;
}

const std::uint8_t* field_lmk_for(const node_core::Peer& peer) {
#if SC_NODE_ENCRYPTION_ENABLED
  static const std::uint8_t gateway_lmk[ESP_NOW_KEY_LEN] =
      SC_GATEWAY_LMK_BYTES;
  static const std::uint8_t node_1_lmk[ESP_NOW_KEY_LEN] =
      SC_NODE_1_LMK_BYTES;
  static const std::uint8_t node_2_lmk[ESP_NOW_KEY_LEN] =
      SC_NODE_2_LMK_BYTES;
  static const std::uint8_t node_3_lmk[ESP_NOW_KEY_LEN] =
      SC_NODE_3_LMK_BYTES;
  if (peer.role == node_core::PeerRole::GATEWAY) return gateway_lmk;
  if (peer.node_id == NodeId::NODE_1) return node_1_lmk;
  if (peer.node_id == NodeId::NODE_2) return node_2_lmk;
  return node_3_lmk;
#else
  (void)peer;
  return nullptr;
#endif
}

bool initialize_esp_now() {
  if (!registry.valid()) return false;
  if (esp_wifi_set_channel(node_config::kCommunicationChannel,
                           WIFI_SECOND_CHAN_NONE) != ESP_OK)
    return false;
  if (esp_now_init() != ESP_OK ||
      esp_now_register_recv_cb(on_esp_now_receive) != ESP_OK ||
      esp_now_register_send_cb(on_esp_now_send) != ESP_OK)
    return false;
#if SC_NODE_ENCRYPTION_ENABLED
  const std::uint8_t pmk[ESP_NOW_KEY_LEN] = SC_ESPNOW_PMK_BYTES;
  if (esp_now_set_pmk(pmk) != ESP_OK) return false;
#endif
  for (const node_core::Peer& peer : peers) {
    esp_now_peer_info_t info{};
    std::memcpy(info.peer_addr, peer.mac.data(), peer.mac.size());
    info.channel = node_config::kCommunicationChannel;
    info.ifidx = WIFI_IF_STA;
    info.encrypt = peer.encrypted;
    const std::uint8_t* lmk = field_lmk_for(peer);
    if (peer.encrypted && lmk != nullptr)
      std::memcpy(info.lmk, lmk, ESP_NOW_KEY_LEN);
    if (esp_now_add_peer(&info) != ESP_OK) return false;
  }
  return true;
}

node_core::Destination destination_for(const node_core::Peer& peer) {
  if (peer.role == node_core::PeerRole::GATEWAY)
    return node_core::Destination::GATEWAY;
  if (peer.node_id == NodeId::NODE_1)
    return node_core::Destination::NODE_1;
  if (peer.node_id == NodeId::NODE_2)
    return node_core::Destination::NODE_2;
  return node_core::Destination::NODE_3;
}

const MacAddress& mac_for_destination(node_core::Destination destination) {
  if (destination == node_core::Destination::GATEWAY) return gateway_mac;
  if (destination == node_core::Destination::NODE_1) return node_1_mac;
  if (destination == node_core::Destination::NODE_2) return node_2_mac;
  return node_3_mac;
}

bool enqueue_message(WireMessage message, const node_core::Destination* targets,
                     std::size_t target_count) {
  if (!transmission_ready || target_count == 0 ||
      !tx_queue.make_room(message.message_type, target_count))
    return false;
  std::uint32_t candidate = 0;
  if (!sequence_counter.peek_next(candidate)) return false;
  message.boot_counter = boot_counter;
  message.sequence = candidate;
  message.uptime_ms = millis();
  std::array<std::uint8_t, smart_campus::kMaxWireBytes> encoded{};
  const smart_campus::EncodeResult result =
      smart_campus::encode_wire_message(message, encoded.data(),
                                        encoded.size());
  if (!result) return false;
  if (!sequence_counter.commit(candidate)) return false;
  for (std::size_t index = 0; index < target_count; ++index) {
    if (!tx_queue.enqueue(encoded.data(), result.bytes_written,
                          message.message_type, candidate, targets[index]))
      return false;
  }
  return true;
}

bool enqueue_gateway_message(WireMessage message) {
  const node_core::Destination target =
      node_core::Destination::GATEWAY;
  return enqueue_message(message, &target, 1);
}

void enqueue_sensor_event(SensorId sensor, std::uint32_t now_ms) {
  WireMessage message{};
  message.node_id = profile.node_id;
  message.message_type = MessageType::SENSOR_EVENT;
  message.payload = smart_campus::SensorEventPayload{
      sensor, SensorState::ACTIVE, SensorEdge::RISING_EDGE, now_ms};
  std::array<node_core::Destination, 3> targets{};
  std::size_t count = 0;
  for (const node_core::Peer& peer : peers)
    targets[count++] = destination_for(peer);
  enqueue_message(message, targets.data(), count);
}

bool enqueue_lamp_state(LampId lamp) {
  const node_core::LampSnapshot state = lighting.snapshot(lamp);
  WireMessage message{};
  message.node_id = profile.node_id;
  message.message_type = MessageType::LAMP_STATE;
  message.payload = smart_campus::LampStatePayload{
      lamp,
      state.operating_state,
      smart_campus::LampHealth::HEALTHY,
      state.brightness_percent,
      state.target_brightness_percent,
      state.brightness_percent};
  return enqueue_gateway_message(message);
}

void enqueue_heartbeat() {
  WireMessage message{};
  message.node_id = profile.node_id;
  message.message_type = MessageType::HEARTBEAT;
  message.payload = smart_campus::HeartbeatPayload{
      node_version::kMajor, node_version::kMinor, node_version::kPatch,
      node_config::kCommunicationChannel};
  enqueue_gateway_message(message);
}

void configure_pwm() {
  for (std::size_t index = 0; index < profile.lamp_count; ++index) {
    const node_profiles::LampPin& lamp = profile.lamps[index];
#if ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcAttachChannel(lamp.pin, node_config::kPwmFrequencyHz,
                      node_config::kPwmResolutionBits, lamp.pwm_channel);
#else
    ledcSetup(lamp.pwm_channel, node_config::kPwmFrequencyHz,
              node_config::kPwmResolutionBits);
    ledcAttachPin(lamp.pin, lamp.pwm_channel);
#endif
  }
}

void write_pwm(std::size_t index, std::uint8_t brightness) {
  const node_profiles::LampPin& lamp = profile.lamps[index];
  const std::uint8_t duty =
      node_core::brightness_to_pwm(brightness,
                                   node_config::kPwmActiveHigh);
  if (last_pwm[index] == duty) return;
  last_pwm[index] = duty;
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWriteChannel(lamp.pwm_channel, duty);
#else
  ledcWrite(lamp.pwm_channel, duty);
#endif
}

bool pop_received(RawFrame& frame) {
  portENTER_CRITICAL(&receive_mux);
  if (receive_count == 0) {
    portEXIT_CRITICAL(&receive_mux);
    return false;
  }
  frame = receive_items[receive_head];
  receive_head = (receive_head + 1) % kReceiveCapacity;
  --receive_count;
  portEXIT_CRITICAL(&receive_mux);
  return true;
}

void service_received() {
  RawFrame raw{};
  while (pop_received(raw)) {
    const smart_campus::DecodeResult decoded =
        smart_campus::decode_wire_message(raw.bytes.data(), raw.length);
    if (!decoded ||
        !registry.node_source_matches(raw.source,
                                      decoded.message.node_id) ||
        decoded.message.message_type != MessageType::SENSOR_EVENT)
      continue;
    const auto* sensor =
        std::get_if<smart_campus::SensorEventPayload>(
            &decoded.message.payload);
    if (sensor == nullptr || sensor->state != SensorState::ACTIVE ||
        sensor->edge != SensorEdge::RISING_EDGE)
      continue;
    lighting.on_peer_sensor(decoded.message.node_id, sensor->sensor_id,
                            millis());
  }
}

void service_inputs(std::uint32_t now_ms) {
  for (std::size_t index = 0; index < profile.sensor_count; ++index) {
    const bool pin_high = digitalRead(profile.sensors[index].pin) == HIGH;
    const bool active =
        node_config::kIrActiveHigh ? pin_high : !pin_high;
    if (debouncers[index].update(active, now_ms,
                                  node_config::kDebounceMs) ==
        node_core::DebounceEvent::BECAME_ACTIVE) {
      lighting.on_local_sensor(profile.sensors[index].id, now_ms);
      enqueue_sensor_event(profile.sensors[index].id, now_ms);
    }
  }
}

void service_lighting(std::uint32_t now_ms) {
  lighting.tick(now_ms);
  for (std::size_t index = 0; index < profile.lamp_count; ++index) {
    const LampId lamp = profile.lamps[index].id;
    const node_core::LampSnapshot state = lighting.snapshot(lamp);
    write_pwm(index, state.brightness_percent);
    if (lighting.publish_requested(lamp) && enqueue_lamp_state(lamp))
      lighting.clear_publish_request(lamp);
  }
}

#if SMART_CAMPUS_NODE_ID == 2
std::uint32_t to_milli(float value) {
  if (!std::isfinite(value) || value < 0.0F) return 0;
  const double rounded = std::round(static_cast<double>(value));
  if (rounded >=
      static_cast<double>(std::numeric_limits<std::uint32_t>::max()))
    return std::numeric_limits<std::uint32_t>::max();
  return static_cast<std::uint32_t>(rounded);
}

void service_ambient(std::uint32_t now_ms) {
  if (now_ms - last_ambient_ms < 1000) return;
  last_ambient_ms = now_ms;
  const float lux = ambient_ready
                        ? ambient_sensor.readLightLevel()
                        : std::numeric_limits<float>::quiet_NaN();
  lighting.update_ambient(lux, ambient_ready && std::isfinite(lux), now_ms);
}

void service_electrical(std::uint32_t now_ms) {
  if (now_ms - last_electrical_ms <
      node_config::kElectricalIntervalMs)
    return;
  const std::uint32_t elapsed_ms = now_ms - last_electrical_ms;
  last_electrical_ms = now_ms;
  if (!electrical_ready) return;
  const float voltage_v = electrical_sensor.getBusVoltage_V();
  const float current_ma = electrical_sensor.getCurrent_mA();
  const float power_mw = electrical_sensor.getPower_mW();
  if (!node_core::valid_electrical_measurement(
          profile.node_id, voltage_v, current_ma, power_mw))
    return;
  energy_mwh += static_cast<double>(power_mw) *
                static_cast<double>(elapsed_ms) / 3600000.0;
  WireMessage message{};
  message.node_id = profile.node_id;
  message.message_type = MessageType::ELECTRICAL_MEASUREMENT;
  message.payload = smart_campus::ElectricalMeasurementPayload{
      to_milli(voltage_v * 1000.0F), to_milli(current_ma),
      to_milli(power_mw), to_milli(static_cast<float>(energy_mwh))};
  enqueue_gateway_message(message);
}
#else
void service_ambient(std::uint32_t) {}
void service_electrical(std::uint32_t) {}
#endif

void service_heartbeat(std::uint32_t now_ms) {
  if (now_ms - last_heartbeat_ms <
      node_config::kHeartbeatIntervalMs)
    return;
  last_heartbeat_ms = now_ms;
  enqueue_heartbeat();
}

void service_tx() {
  if (!transmission_ready) return;
  if (send_result_ready) {
    const bool success = send_succeeded;
    send_result_ready = false;
    send_in_flight = false;
    tx_queue.mark_send_result(success);
  }
  if (send_in_flight) return;
  const node_core::TxItem* item = tx_queue.begin_send();
  if (item == nullptr) return;
  const MacAddress& target = mac_for_destination(item->destination);
  if (esp_now_send(target.data(), item->bytes.data(), item->length) ==
      ESP_OK) {
    send_in_flight = true;
  } else {
    tx_queue.mark_send_result(false);
  }
}

}  // namespace

void setup() {
  Serial.begin(115200);
  for (std::size_t index = 0; index < profile.sensor_count; ++index)
    pinMode(profile.sensors[index].pin, INPUT);
  configure_pwm();

#if SMART_CAMPUS_NODE_ID == 2
  Wire.begin(profile.i2c_sda, profile.i2c_scl);
  ambient_ready =
      ambient_sensor.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  electrical_ready = electrical_sensor.begin();
#endif

  PreferencesBootCounterStore store;
  const node_core::BootCounterResult boot =
      node_core::next_boot_counter(store);
  if (boot.ok) boot_counter = boot.counter;

  WiFi.mode(WIFI_STA);
  if (esp_wifi_set_mac(WIFI_IF_STA, selected_mac().data()) == ESP_OK &&
      boot_counter != 0)
    transmission_ready = initialize_esp_now();
  if (!transmission_ready)
    Serial.println("node: communication unavailable; local lighting remains active");
}

void loop() {
  const std::uint32_t now_ms = millis();
  service_inputs(now_ms);
  service_received();
  service_ambient(now_ms);
  service_lighting(now_ms);
  service_electrical(now_ms);
  service_heartbeat(now_ms);
  service_tx();
  delay(1);
}
