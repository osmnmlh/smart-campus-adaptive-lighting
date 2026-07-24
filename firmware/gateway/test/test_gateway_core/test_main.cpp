#include <unity.h>

#include <array>
#include <cstdint>
#include <cstring>
#include <string>

#include "gateway_core/boot_counter.hpp"
#include "gateway_core/bounded_queue.hpp"
#include "gateway_core/gateway_core.hpp"
#include "gateway_core/mqtt_policy.hpp"
#include "gateway_core/outbox.hpp"
#include "gateway_core/peer_registry.hpp"
#include "gateway_core/readiness.hpp"
#include "smart_campus/crc32.hpp"
#include "smart_campus/identifiers.hpp"
#include "smart_campus/ownership.hpp"
#include "smart_campus/protocol_limits.hpp"
#include "smart_campus/wire_codec.hpp"

using namespace smart_campus;
using namespace gateway_core;

void setUp() {}
void tearDown() {}

namespace {

const MacAddress kMac1{0x02, 0, 0, 0, 0, 1};
const MacAddress kMac2{0x02, 0, 0, 0, 0, 2};
const MacAddress kMac3{0x02, 0, 0, 0, 0, 3};
const MacAddress kUnknown{0x02, 0, 0, 0, 0, 9};
constexpr const char* kWellFormedCa =
    "-----BEGIN CERTIFICATE-----\n"
    "dGVzdC1vbmx5LWNh\n"
    "-----END CERTIFICATE-----\n";
const std::array<Peer, 3> kLabPeers{{
    {NodeId::NODE_1, kMac1, false},
    {NodeId::NODE_2, kMac2, false},
    {NodeId::NODE_3, kMac3, false},
}};
const std::array<Peer, 3> kFieldPeers{{
    {NodeId::NODE_1, kMac1, true},
    {NodeId::NODE_2, kMac2, true},
    {NodeId::NODE_3, kMac3, true},
}};

WireMessage heartbeat(NodeId node = NodeId::NODE_1, std::uint32_t sequence = 1) {
  return {node, MessageType::HEARTBEAT, 7, sequence, 1234,
          HeartbeatPayload{1, 2, 3, 6}};
}
WireMessage sensor(NodeId node, SensorId id) {
  return {node, MessageType::SENSOR_EVENT, 7, 2, 1240,
          SensorEventPayload{id, SensorState::ACTIVE, SensorEdge::RISING_EDGE, 1239}};
}
WireMessage lamp(NodeId node, LampId id) {
  return {node, MessageType::LAMP_STATE, 7, 3, 1250,
          LampStatePayload{id, LampOperatingState::STANDBY, LampHealth::HEALTHY,
                           30, 30, 30}};
}
WireMessage electrical() {
  return {NodeId::NODE_2, MessageType::ELECTRICAL_MEASUREMENT, 7, 4, 1260,
          ElectricalMeasurementPayload{12000, 500, 6000, 1250}};
}
EncodeResult encode(const WireMessage& message,
                    std::array<std::uint8_t, kMaxWireBytes>& bytes) {
  return encode_wire_message(message, bytes.data(), bytes.size());
}

class FakeStore : public BootCounterStore {
 public:
  bool read_ok{true};
  bool write_ok{true};
  std::uint32_t value{0};
  std::string last_namespace{};
  std::string last_key{};
  bool read(const char* name_space, const char* key, std::uint32_t& output) override {
    last_namespace = name_space;
    last_key = key;
    output = value;
    return read_ok;
  }
  bool write(const char* name_space, const char* key, std::uint32_t input) override {
    last_namespace = name_space;
    last_key = key;
    if (write_ok) value = input;
    return write_ok;
  }
};

#define BOOL_TEST(name, expression) \
  void name() { TEST_ASSERT_TRUE(expression); }

void test_mqtt_lab_plaintext_allowed_but_not_deployable() {
  const auto result = validate_mqtt_policy(
      {MqttDeploymentProfile::LAB, "mqtt://192.0.2.1:1883", "", "", nullptr});
  TEST_ASSERT_TRUE(result);
  TEST_ASSERT_FALSE(result.tls_enabled);
  TEST_ASSERT_FALSE(result.deployable);
}
void test_mqtt_lab_tls_with_ca_allowed_but_not_deployable() {
  const auto result = validate_mqtt_policy(
      {MqttDeploymentProfile::LAB, "mqtts://broker.invalid:8883", "", "",
       kWellFormedCa});
  TEST_ASSERT_TRUE(result);
  TEST_ASSERT_TRUE(result.tls_enabled);
  TEST_ASSERT_FALSE(result.deployable);
}
void test_mqtt_lab_tls_requires_ca() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::MISSING_CA_CERTIFICATE),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::LAB,
                            "mqtts://broker.invalid:8883", "", "", nullptr})
                           .error));
}
void test_mqtt_lab_plaintext_rejects_ca() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::PLAINTEXT_WITH_CA_CERTIFICATE),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::LAB,
                            "mqtt://192.0.2.1:1883", "", "", kWellFormedCa})
                           .error));
}
void test_mqtt_field_rejects_plaintext() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::FIELD_REQUIRES_MQTTS),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::FIELD,
                            "mqtt://broker.invalid:1883", "gateway", "secret",
                            kWellFormedCa})
                           .error));
}
void test_mqtt_field_tls_is_deployable() {
  const auto result = validate_mqtt_policy(
      {MqttDeploymentProfile::FIELD, "mqtts://broker.invalid:8883", "gateway",
       "secret", kWellFormedCa});
  TEST_ASSERT_TRUE(result);
  TEST_ASSERT_TRUE(result.tls_enabled);
  TEST_ASSERT_TRUE(result.deployable);
}
void test_mqtt_field_requires_username() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::MISSING_USERNAME),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::FIELD,
                            "mqtts://broker.invalid:8883", "", "secret",
                            kWellFormedCa})
                           .error));
}
void test_mqtt_field_requires_password() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::MISSING_PASSWORD),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::FIELD,
                            "mqtts://broker.invalid:8883", "gateway", "",
                            kWellFormedCa})
                           .error));
}
void test_mqtt_field_requires_ca() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::MISSING_CA_CERTIFICATE),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::FIELD,
                            "mqtts://broker.invalid:8883", "gateway", "secret",
                            nullptr})
                           .error));
}
void test_mqtt_rejects_malformed_ca() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::INVALID_CA_CERTIFICATE),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::FIELD,
                            "mqtts://broker.invalid:8883", "gateway", "secret",
                            "not-a-pem"})
                           .error));
}
void test_mqtt_rejects_ca_without_begin_marker() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::INVALID_CA_CERTIFICATE),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::FIELD,
                            "mqtts://broker.invalid:8883", "gateway", "secret",
                            "dGVzdA==\n-----END CERTIFICATE-----"})
                           .error));
}
void test_mqtt_rejects_ca_without_end_marker() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::INVALID_CA_CERTIFICATE),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::FIELD,
                            "mqtts://broker.invalid:8883", "gateway", "secret",
                            "-----BEGIN CERTIFICATE-----\ndGVzdA=="})
                           .error));
}
void test_mqtt_rejects_placeholder_ca() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::PLACEHOLDER_CA_CERTIFICATE),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::FIELD,
                            "mqtts://broker.invalid:8883", "gateway", "secret",
                            "REPLACE_WITH_TRUSTED_CA_CERTIFICATE"})
                           .error));
}
void test_mqtt_rejects_embedded_credentials() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::EMBEDDED_CREDENTIALS),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::FIELD,
                            "mqtts://gateway:secret@broker.invalid:8883",
                            "gateway", "secret", kWellFormedCa})
                           .error));
}
void test_mqtt_rejects_unsupported_scheme() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::UNSUPPORTED_SCHEME),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::LAB,
                            "ws://broker.invalid:80", "", "", nullptr})
                           .error));
}
void test_mqtt_rejects_empty_uri() {
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::MISSING_URI),
      static_cast<int>(validate_mqtt_policy(
                           {MqttDeploymentProfile::LAB, "", "", "", nullptr})
                           .error));
}
void test_mqtt_ci_plaintext_is_explicitly_not_deployable() {
  const auto result = validate_mqtt_policy(
      {MqttDeploymentProfile::CI, "mqtt://192.0.2.1:1883", "", "", nullptr});
  TEST_ASSERT_TRUE(result);
  TEST_ASSERT_FALSE(result.deployable);
}
void test_mqtt_ci_tls_placeholder_is_rejected() {
  const auto result = validate_mqtt_policy(
      {MqttDeploymentProfile::CI, "mqtts://mqtt.ci.invalid:8883", "ci", "ci",
       "-----BEGIN CERTIFICATE-----\nPLACEHOLDER\n-----END CERTIFICATE-----"});
  TEST_ASSERT_EQUAL_INT(
      static_cast<int>(MqttPolicyError::PLACEHOLDER_CA_CERTIFICATE),
      static_cast<int>(result.error));
  TEST_ASSERT_FALSE(result.deployable);
}
void test_mqtt_policy_does_not_mutate_input() {
  char uri[] = "mqtts://broker.invalid:8883";
  char username[] = "gateway";
  char password[] = "secret";
  char ca[] =
      "-----BEGIN CERTIFICATE-----\n"
      "dGVzdC1vbmx5LWNh\n"
      "-----END CERTIFICATE-----\n";
  const auto result = validate_mqtt_policy(
      {MqttDeploymentProfile::FIELD, uri, username, password, ca});
  TEST_ASSERT_TRUE(result);
  TEST_ASSERT_EQUAL_STRING("mqtts://broker.invalid:8883", uri);
  TEST_ASSERT_EQUAL_STRING("gateway", username);
  TEST_ASSERT_EQUAL_STRING("secret", password);
  TEST_ASSERT_EQUAL_STRING(kWellFormedCa, ca);
}
void test_mqtt_safe_diagnostic_does_not_project_secret() {
  constexpr const char* kSecret = "super-secret-password";
  const auto result = validate_mqtt_policy(
      {MqttDeploymentProfile::FIELD, "mqtts://broker.invalid:8883", "gateway",
       kSecret, nullptr});
  const char* diagnostic = mqtt_policy_error_message(result.error);
  TEST_ASSERT_NOT_NULL(diagnostic);
  TEST_ASSERT_NULL(std::strstr(diagnostic, kSecret));
  TEST_ASSERT_NULL(std::strstr(diagnostic, "gateway.invalid"));
}

BOOL_TEST(test_node_1_valid, is_valid(NodeId::NODE_1))
BOOL_TEST(test_node_2_valid, is_valid(NodeId::NODE_2))
BOOL_TEST(test_node_3_valid, is_valid(NodeId::NODE_3))
BOOL_TEST(test_node_zero_invalid, !is_valid(static_cast<NodeId>(0)))
BOOL_TEST(test_node_four_invalid, !is_valid(static_cast<NodeId>(4)))
BOOL_TEST(test_heartbeat_type_valid, is_valid(MessageType::HEARTBEAT))
BOOL_TEST(test_sensor_type_valid, is_valid(MessageType::SENSOR_EVENT))
BOOL_TEST(test_lamp_type_valid, is_valid(MessageType::LAMP_STATE))
BOOL_TEST(test_electrical_type_valid, is_valid(MessageType::ELECTRICAL_MEASUREMENT))
BOOL_TEST(test_unknown_type_invalid, !is_valid(static_cast<MessageType>(9)))
BOOL_TEST(test_node1_ir1_owner, owns_sensor(NodeId::NODE_1, SensorId::IR1))
BOOL_TEST(test_node1_ir2_owner, owns_sensor(NodeId::NODE_1, SensorId::IR2))
BOOL_TEST(test_node2_ir3_owner, owns_sensor(NodeId::NODE_2, SensorId::IR3))
BOOL_TEST(test_node3_ir4_owner, owns_sensor(NodeId::NODE_3, SensorId::IR4))
BOOL_TEST(test_node3_ir5_owner, owns_sensor(NodeId::NODE_3, SensorId::IR5))
BOOL_TEST(test_node1_ir5_not_owner, !owns_sensor(NodeId::NODE_1, SensorId::IR5))
BOOL_TEST(test_node2_ir1_not_owner, !owns_sensor(NodeId::NODE_2, SensorId::IR1))
BOOL_TEST(test_node3_ir3_not_owner, !owns_sensor(NodeId::NODE_3, SensorId::IR3))
BOOL_TEST(test_node1_l1_owner, owns_lamp(NodeId::NODE_1, LampId::L1))
BOOL_TEST(test_node1_l2_owner, owns_lamp(NodeId::NODE_1, LampId::L2))
BOOL_TEST(test_node2_l3_owner, owns_lamp(NodeId::NODE_2, LampId::L3))
BOOL_TEST(test_node3_l4_owner, owns_lamp(NodeId::NODE_3, LampId::L4))
BOOL_TEST(test_node3_l5_owner, owns_lamp(NodeId::NODE_3, LampId::L5))
BOOL_TEST(test_node1_l5_not_owner, !owns_lamp(NodeId::NODE_1, LampId::L5))
BOOL_TEST(test_node2_l1_not_owner, !owns_lamp(NodeId::NODE_2, LampId::L1))
BOOL_TEST(test_node3_l3_not_owner, !owns_lamp(NodeId::NODE_3, LampId::L3))
BOOL_TEST(test_node2_electrical_owner, owns_electrical_measurement(NodeId::NODE_2))
BOOL_TEST(test_node1_not_electrical_owner, !owns_electrical_measurement(NodeId::NODE_1))
BOOL_TEST(test_channel_one_valid, valid_channel(1))
BOOL_TEST(test_channel_thirteen_valid, valid_channel(13))
BOOL_TEST(test_channel_zero_invalid, !valid_channel(0))
BOOL_TEST(test_channel_fourteen_invalid, !valid_channel(14))
BOOL_TEST(test_wire_budget_is_220, kMaxWireBytes == 220)
BOOL_TEST(test_receive_queue_capacity_is_32, kGatewayReceiveQueueCapacity == 32)
BOOL_TEST(test_outbox_capacity_is_64, kGatewayOutboxCapacity == 64)
BOOL_TEST(test_mqtt_qos_is_one, kMqttQos == 1)
BOOL_TEST(test_publish_attempts_are_four, kMaxPublishAttempts == 4)

void test_crc32_empty() { TEST_ASSERT_EQUAL_HEX32(0, crc32(nullptr, 0)); }
void test_crc32_standard_vector() {
  const char* value = "123456789";
  TEST_ASSERT_EQUAL_HEX32(0xCBF43926U,
                          crc32(reinterpret_cast<const std::uint8_t*>(value), 9));
}
void test_boot_id_minimum() {
  TEST_ASSERT_EQUAL_STRING("BOOT_00000001", format_boot_id(1).c_str());
}
void test_boot_id_seven() {
  TEST_ASSERT_EQUAL_STRING("BOOT_00000007", format_boot_id(7).c_str());
}
void test_boot_id_maximum() {
  TEST_ASSERT_EQUAL_STRING("BOOT_99999999", format_boot_id(99999999).c_str());
}
void test_boot_id_zero_rejected() { TEST_ASSERT_TRUE(format_boot_id(0).empty()); }
void test_boot_id_overflow_rejected() {
  TEST_ASSERT_TRUE(format_boot_id(100000000).empty());
}
void test_message_id() {
  TEST_ASSERT_EQUAL_STRING("NODE_1:BOOT_00000007:124",
                           build_message_id(NodeId::NODE_1, 7, 124).c_str());
}
void test_message_id_zero_sequence_rejected() {
  TEST_ASSERT_TRUE(build_message_id(NodeId::NODE_1, 7, 0).empty());
}

void assert_round_trip(const WireMessage& original) {
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  const auto encoded = encode(original, bytes);
  TEST_ASSERT_TRUE(encoded);
  TEST_ASSERT_LESS_OR_EQUAL_UINT32(kMaxWireBytes, encoded.bytes_written);
  const auto decoded = decode_wire_message(bytes.data(), encoded.bytes_written);
  TEST_ASSERT_TRUE(decoded);
  TEST_ASSERT_EQUAL_UINT8(static_cast<std::uint8_t>(original.node_id),
                          static_cast<std::uint8_t>(decoded.message.node_id));
  TEST_ASSERT_EQUAL_UINT8(static_cast<std::uint8_t>(original.message_type),
                          static_cast<std::uint8_t>(decoded.message.message_type));
  TEST_ASSERT_EQUAL_UINT32(original.sequence, decoded.message.sequence);
}
void test_heartbeat_round_trip() { assert_round_trip(heartbeat()); }
void test_sensor_round_trip() { assert_round_trip(sensor(NodeId::NODE_1, SensorId::IR1)); }
void test_lamp_round_trip() { assert_round_trip(lamp(NodeId::NODE_2, LampId::L3)); }
void test_electrical_round_trip() { assert_round_trip(electrical()); }
void test_encode_null_output() {
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::NULL_ARGUMENT),
                        static_cast<int>(encode_wire_message(heartbeat(), nullptr, 220).error));
}
void test_encode_small_buffer() {
  std::array<std::uint8_t, 2> bytes{};
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::BUFFER_TOO_SMALL),
                        static_cast<int>(
                            encode_wire_message(heartbeat(), bytes.data(), bytes.size()).error));
}
void test_decode_null_input() {
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::NULL_ARGUMENT),
                        static_cast<int>(decode_wire_message(nullptr, 1).error));
}
void test_decode_truncated_header() {
  std::array<std::uint8_t, 8> bytes{};
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::TRUNCATED_FRAME),
                        static_cast<int>(decode_wire_message(bytes.data(), bytes.size()).error));
}
void test_decode_bad_magic() {
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  auto result = encode(heartbeat(), bytes);
  bytes[0] = 'X';
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::BAD_MAGIC),
                        static_cast<int>(decode_wire_message(bytes.data(), result.bytes_written).error));
}
void test_decode_future_version() {
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  auto result = encode(heartbeat(), bytes);
  bytes[2] = 2;
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::UNSUPPORTED_VERSION),
                        static_cast<int>(decode_wire_message(bytes.data(), result.bytes_written).error));
}
void test_decode_crc_mismatch() {
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  auto result = encode(heartbeat(), bytes);
  bytes[20] ^= 1U;
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::CRC_MISMATCH),
                        static_cast<int>(decode_wire_message(bytes.data(), result.bytes_written).error));
}
void test_decode_trailing_byte() {
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  auto result = encode(heartbeat(), bytes);
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::TRAILING_BYTES),
                        static_cast<int>(decode_wire_message(bytes.data(), result.bytes_written + 1).error));
}
void test_decode_oversized() {
  std::array<std::uint8_t, kMaxWireBytes + 1> bytes{};
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::OVERSIZED_FRAME),
                        static_cast<int>(decode_wire_message(bytes.data(), bytes.size()).error));
}
void test_invalid_heartbeat_channel() {
  auto value = heartbeat();
  value.payload = HeartbeatPayload{1, 0, 0, 14};
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::INVALID_PAYLOAD),
                        static_cast<int>(encode(value, bytes).error));
}
void test_invalid_sensor_ownership() {
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::OWNERSHIP_VIOLATION),
                        static_cast<int>(encode(sensor(NodeId::NODE_1, SensorId::IR5), bytes).error));
}
void test_invalid_lamp_ownership() {
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::OWNERSHIP_VIOLATION),
                        static_cast<int>(encode(lamp(NodeId::NODE_3, LampId::L3), bytes).error));
}
void test_invalid_electrical_ownership() {
  auto value = electrical();
  value.node_id = NodeId::NODE_1;
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::OWNERSHIP_VIOLATION),
                        static_cast<int>(encode(value, bytes).error));
}
void test_invalid_brightness() {
  auto value = lamp(NodeId::NODE_1, LampId::L1);
  auto payload = std::get<LampStatePayload>(value.payload);
  payload.brightness_percent = 101;
  value.payload = payload;
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::INVALID_PAYLOAD),
                        static_cast<int>(encode(value, bytes).error));
}
void test_wrong_variant() {
  auto value = heartbeat();
  value.payload = SensorEventPayload{};
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  TEST_ASSERT_EQUAL_INT(static_cast<int>(CodecError::INVALID_PAYLOAD),
                        static_cast<int>(encode(value, bytes).error));
}

void test_lab_registry_valid() { TEST_ASSERT_TRUE(PeerRegistry(DeploymentMode::LAB, kLabPeers).valid()); }
void test_field_registry_valid() { TEST_ASSERT_TRUE(PeerRegistry(DeploymentMode::FIELD, kFieldPeers).valid()); }
void test_field_unencrypted_rejected() {
  TEST_ASSERT_EQUAL_INT(static_cast<int>(PeerRegistryError::FIELD_REQUIRES_ENCRYPTION),
                        static_cast<int>(PeerRegistry(DeploymentMode::FIELD, kLabPeers).validation_error()));
}
void test_duplicate_node_rejected() {
  auto peers = kLabPeers;
  peers[1].node_id = NodeId::NODE_1;
  TEST_ASSERT_EQUAL_INT(static_cast<int>(PeerRegistryError::DUPLICATE_NODE),
                        static_cast<int>(PeerRegistry(DeploymentMode::LAB, peers).validation_error()));
}
void test_duplicate_mac_rejected() {
  auto peers = kLabPeers;
  peers[1].mac = kMac1;
  TEST_ASSERT_EQUAL_INT(static_cast<int>(PeerRegistryError::DUPLICATE_MAC),
                        static_cast<int>(PeerRegistry(DeploymentMode::LAB, peers).validation_error()));
}
void test_zero_mac_rejected() {
  auto peers = kLabPeers;
  peers[1].mac = {0, 0, 0, 0, 0, 0};
  TEST_ASSERT_EQUAL_INT(static_cast<int>(PeerRegistryError::INVALID_MAC),
                        static_cast<int>(PeerRegistry(DeploymentMode::LAB, peers).validation_error()));
}
void test_broadcast_mac_rejected() {
  auto peers = kLabPeers;
  peers[1].mac = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  TEST_ASSERT_EQUAL_INT(static_cast<int>(PeerRegistryError::BROADCAST_MAC),
                        static_cast<int>(PeerRegistry(DeploymentMode::LAB, peers).validation_error()));
}
void test_registry_find_known() {
  PeerRegistry registry(DeploymentMode::LAB, kLabPeers);
  TEST_ASSERT_NOT_NULL(registry.find(kMac2));
}
void test_registry_reject_unknown() {
  PeerRegistry registry(DeploymentMode::LAB, kLabPeers);
  TEST_ASSERT_NULL(registry.find(kUnknown));
}
void test_registry_source_match() {
  PeerRegistry registry(DeploymentMode::LAB, kLabPeers);
  TEST_ASSERT_TRUE(registry.source_matches(kMac3, NodeId::NODE_3));
}
void test_registry_source_mismatch() {
  PeerRegistry registry(DeploymentMode::LAB, kLabPeers);
  TEST_ASSERT_FALSE(registry.source_matches(kMac3, NodeId::NODE_1));
}

void test_bounded_queue_fifo() {
  BoundedQueue<int, 2> queue;
  int value = 0;
  TEST_ASSERT_TRUE(queue.push(7));
  TEST_ASSERT_TRUE(queue.push(8));
  TEST_ASSERT_TRUE(queue.pop(value));
  TEST_ASSERT_EQUAL_INT(7, value);
  TEST_ASSERT_TRUE(queue.pop(value));
  TEST_ASSERT_EQUAL_INT(8, value);
}
void test_bounded_queue_overflow() {
  BoundedQueue<int, 1> queue;
  TEST_ASSERT_TRUE(queue.push(1));
  TEST_ASSERT_FALSE(queue.push(2));
}
void test_bounded_queue_underflow() {
  BoundedQueue<int, 1> queue;
  int value = 0;
  TEST_ASSERT_FALSE(queue.pop(value));
}

void test_gateway_accepts_known_valid() {
  PeerRegistry registry(DeploymentMode::LAB, kLabPeers);
  GatewayCore core(registry);
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  auto encoded = encode(heartbeat(), bytes);
  auto result = core.receive(kMac1, bytes.data(), encoded.bytes_written, 100);
  TEST_ASSERT_TRUE(result);
  TEST_ASSERT_EQUAL_UINT32(1, result.gateway_sequence);
}
void test_gateway_unknown_mac_no_sequence() {
  PeerRegistry registry(DeploymentMode::LAB, kLabPeers);
  GatewayCore core(registry);
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  auto encoded = encode(heartbeat(), bytes);
  TEST_ASSERT_FALSE(core.receive(kUnknown, bytes.data(), encoded.bytes_written, 100));
  TEST_ASSERT_EQUAL_UINT32(0, core.last_gateway_sequence());
}
void test_gateway_mismatch_no_sequence() {
  PeerRegistry registry(DeploymentMode::LAB, kLabPeers);
  GatewayCore core(registry);
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  auto encoded = encode(heartbeat(NodeId::NODE_2), bytes);
  TEST_ASSERT_EQUAL_INT(static_cast<int>(ReceiveError::SOURCE_NODE_MISMATCH),
                        static_cast<int>(core.receive(kMac1, bytes.data(), encoded.bytes_written, 100).error));
  TEST_ASSERT_EQUAL_UINT32(0, core.last_gateway_sequence());
}
void test_gateway_invalid_no_sequence() {
  PeerRegistry registry(DeploymentMode::LAB, kLabPeers);
  GatewayCore core(registry);
  std::array<std::uint8_t, 4> bytes{};
  TEST_ASSERT_FALSE(core.receive(kMac1, bytes.data(), bytes.size(), 100));
  TEST_ASSERT_EQUAL_UINT32(0, core.last_gateway_sequence());
}
void test_gateway_sequence_exhaustion() {
  PeerRegistry registry(DeploymentMode::LAB, kLabPeers);
  GatewayCore core(registry);
  core.set_gateway_sequence_for_test(0xFFFFFFFFU);
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  auto encoded = encode(heartbeat(), bytes);
  TEST_ASSERT_EQUAL_INT(static_cast<int>(ReceiveError::GATEWAY_SEQUENCE_EXHAUSTED),
                        static_cast<int>(core.receive(kMac1, bytes.data(), encoded.bytes_written, 100).error));
}
void test_gateway_pop_preserves_arrival() {
  PeerRegistry registry(DeploymentMode::LAB, kLabPeers);
  GatewayCore core(registry);
  std::array<std::uint8_t, kMaxWireBytes> bytes{};
  auto encoded = encode(heartbeat(), bytes);
  core.receive(kMac1, bytes.data(), encoded.bytes_written, 4321);
  AcceptedFrame frame;
  TEST_ASSERT_TRUE(core.pop(frame));
  TEST_ASSERT_EQUAL_UINT32(4321, frame.arrival_monotonic_ms);
}

PublishItem publish(std::uint32_t sequence, MessageType type) {
  return {0, sequence, type, "smart-campus/v1/nodes/NODE_1/events", "{\"ok\":true}", 0, false};
}
void test_outbox_rejects_empty_topic() {
  Outbox outbox;
  auto item = publish(1, MessageType::SENSOR_EVENT);
  item.topic.clear();
  TEST_ASSERT_FALSE(outbox.enqueue(item));
}
void test_outbox_prioritizes_sensor() {
  Outbox outbox;
  outbox.enqueue(publish(1, MessageType::HEARTBEAT));
  outbox.enqueue(publish(2, MessageType::ELECTRICAL_MEASUREMENT));
  outbox.enqueue(publish(3, MessageType::LAMP_STATE));
  outbox.enqueue(publish(4, MessageType::SENSOR_EVENT));
  TEST_ASSERT_EQUAL_UINT32(4, outbox.next()->gateway_sequence);
}
void test_outbox_ack_removes_only_matching() {
  Outbox outbox;
  outbox.enqueue(publish(1, MessageType::SENSOR_EVENT));
  TEST_ASSERT_TRUE(outbox.mark_sent(1, 77));
  TEST_ASSERT_FALSE(outbox.acknowledge(78));
  TEST_ASSERT_EQUAL_UINT32(1, outbox.size());
  TEST_ASSERT_TRUE(outbox.acknowledge(77));
  TEST_ASSERT_EQUAL_UINT32(0, outbox.size());
}
void test_outbox_retry_payload_immutable() {
  Outbox outbox;
  outbox.enqueue(publish(1, MessageType::SENSOR_EVENT));
  auto* item = outbox.next();
  const std::string original = item->payload;
  outbox.mark_sent(1, 1);
  outbox.mark_failed(1);
  TEST_ASSERT_EQUAL_STRING(original.c_str(), outbox.next()->payload.c_str());
}
void test_outbox_max_four_attempts() {
  Outbox outbox;
  outbox.enqueue(publish(1, MessageType::SENSOR_EVENT));
  for (std::uint32_t packet = 1; packet <= 4; ++packet) {
    TEST_ASSERT_TRUE(outbox.mark_sent(1, packet));
    TEST_ASSERT_EQUAL(packet < 4, outbox.mark_failed(1));
  }
  TEST_ASSERT_NULL(outbox.next());
}
void test_outbox_rejected_send_is_bounded() {
  Outbox outbox;
  outbox.enqueue(publish(1, MessageType::HEARTBEAT));
  TEST_ASSERT_TRUE(outbox.mark_rejected(1));
  TEST_ASSERT_EQUAL_UINT8(1, outbox.next()->attempts);
}
void test_outbox_disconnect_releases_puback_wait() {
  Outbox outbox;
  outbox.enqueue(publish(1, MessageType::HEARTBEAT));
  outbox.mark_sent(1, 44);
  TEST_ASSERT_NULL(outbox.next());
  outbox.release_unacknowledged();
  TEST_ASSERT_NOT_NULL(outbox.next());
}

void test_readiness_all_true_online() {
  const Readiness value{true, true, true, true, true, true};
  TEST_ASSERT_TRUE(value.online());
}
void test_readiness_wifi_false_offline() {
  const Readiness value{false, true, true, true, true, true};
  TEST_ASSERT_FALSE(value.online());
}
void test_readiness_utc_false_offline() {
  const Readiness value{true, true, true, true, false, true};
  TEST_ASSERT_FALSE(value.online());
}
void test_readiness_mqtt_false_offline() {
  const Readiness value{true, true, true, true, true, false};
  TEST_ASSERT_FALSE(value.online());
}
void test_utc_reconstruction() {
  std::uint64_t received = 0;
  TEST_ASSERT_TRUE(reconstruct_received_epoch_ms(1700000005000ULL, 10000, 7000, received));
  TEST_ASSERT_EQUAL_UINT64(1700000002000ULL, received);
}
void test_utc_rejects_unready_clock() {
  std::uint64_t received = 99;
  TEST_ASSERT_FALSE(reconstruct_received_epoch_ms(0, 10000, 7000, received));
  TEST_ASSERT_EQUAL_UINT64(99, received);
}
void test_utc_monotonic_wrap() {
  std::uint64_t received = 0;
  TEST_ASSERT_TRUE(reconstruct_received_epoch_ms(1700000005000ULL, 2, 0xFFFFFFFEU, received));
  TEST_ASSERT_EQUAL_UINT64(1700000004996ULL, received);
}

void test_boot_counter_success() {
  FakeStore store;
  store.value = 6;
  auto result = next_boot_counter(store);
  TEST_ASSERT_TRUE(result.ok);
  TEST_ASSERT_EQUAL_UINT32(7, result.counter);
  TEST_ASSERT_EQUAL_STRING("BOOT_00000007", result.boot_id.c_str());
}
void test_boot_counter_read_failure() {
  FakeStore store;
  store.read_ok = false;
  TEST_ASSERT_FALSE(next_boot_counter(store).ok);
}
void test_boot_counter_write_failure() {
  FakeStore store;
  store.write_ok = false;
  TEST_ASSERT_FALSE(next_boot_counter(store).ok);
}
void test_boot_counter_overflow() {
  FakeStore store;
  store.value = 99999999;
  TEST_ASSERT_FALSE(next_boot_counter(store).ok);
}
void test_boot_counter_uses_documented_keys() {
  FakeStore store;
  next_boot_counter(store);
  TEST_ASSERT_EQUAL_STRING(kBootCounterNamespace, store.last_namespace.c_str());
  TEST_ASSERT_EQUAL_STRING(kBootCounterKey, store.last_key.c_str());
}

}  // namespace

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_mqtt_lab_plaintext_allowed_but_not_deployable);
  RUN_TEST(test_mqtt_lab_tls_with_ca_allowed_but_not_deployable);
  RUN_TEST(test_mqtt_lab_tls_requires_ca);
  RUN_TEST(test_mqtt_lab_plaintext_rejects_ca);
  RUN_TEST(test_mqtt_field_rejects_plaintext);
  RUN_TEST(test_mqtt_field_tls_is_deployable);
  RUN_TEST(test_mqtt_field_requires_username);
  RUN_TEST(test_mqtt_field_requires_password);
  RUN_TEST(test_mqtt_field_requires_ca);
  RUN_TEST(test_mqtt_rejects_malformed_ca);
  RUN_TEST(test_mqtt_rejects_ca_without_begin_marker);
  RUN_TEST(test_mqtt_rejects_ca_without_end_marker);
  RUN_TEST(test_mqtt_rejects_placeholder_ca);
  RUN_TEST(test_mqtt_rejects_embedded_credentials);
  RUN_TEST(test_mqtt_rejects_unsupported_scheme);
  RUN_TEST(test_mqtt_rejects_empty_uri);
  RUN_TEST(test_mqtt_ci_plaintext_is_explicitly_not_deployable);
  RUN_TEST(test_mqtt_ci_tls_placeholder_is_rejected);
  RUN_TEST(test_mqtt_policy_does_not_mutate_input);
  RUN_TEST(test_mqtt_safe_diagnostic_does_not_project_secret);
  RUN_TEST(test_node_1_valid); RUN_TEST(test_node_2_valid); RUN_TEST(test_node_3_valid);
  RUN_TEST(test_node_zero_invalid); RUN_TEST(test_node_four_invalid);
  RUN_TEST(test_heartbeat_type_valid); RUN_TEST(test_sensor_type_valid);
  RUN_TEST(test_lamp_type_valid); RUN_TEST(test_electrical_type_valid);
  RUN_TEST(test_unknown_type_invalid);
  RUN_TEST(test_node1_ir1_owner); RUN_TEST(test_node1_ir2_owner); RUN_TEST(test_node2_ir3_owner);
  RUN_TEST(test_node3_ir4_owner); RUN_TEST(test_node3_ir5_owner);
  RUN_TEST(test_node1_ir5_not_owner); RUN_TEST(test_node2_ir1_not_owner);
  RUN_TEST(test_node3_ir3_not_owner); RUN_TEST(test_node1_l1_owner);
  RUN_TEST(test_node1_l2_owner); RUN_TEST(test_node2_l3_owner); RUN_TEST(test_node3_l4_owner);
  RUN_TEST(test_node3_l5_owner); RUN_TEST(test_node1_l5_not_owner);
  RUN_TEST(test_node2_l1_not_owner); RUN_TEST(test_node3_l3_not_owner);
  RUN_TEST(test_node2_electrical_owner); RUN_TEST(test_node1_not_electrical_owner);
  RUN_TEST(test_channel_one_valid); RUN_TEST(test_channel_thirteen_valid);
  RUN_TEST(test_channel_zero_invalid); RUN_TEST(test_channel_fourteen_invalid);
  RUN_TEST(test_wire_budget_is_220); RUN_TEST(test_receive_queue_capacity_is_32);
  RUN_TEST(test_outbox_capacity_is_64); RUN_TEST(test_mqtt_qos_is_one);
  RUN_TEST(test_publish_attempts_are_four); RUN_TEST(test_crc32_empty);
  RUN_TEST(test_crc32_standard_vector); RUN_TEST(test_boot_id_minimum);
  RUN_TEST(test_boot_id_seven); RUN_TEST(test_boot_id_maximum); RUN_TEST(test_boot_id_zero_rejected);
  RUN_TEST(test_boot_id_overflow_rejected); RUN_TEST(test_message_id);
  RUN_TEST(test_message_id_zero_sequence_rejected);
  RUN_TEST(test_heartbeat_round_trip); RUN_TEST(test_sensor_round_trip);
  RUN_TEST(test_lamp_round_trip); RUN_TEST(test_electrical_round_trip);
  RUN_TEST(test_encode_null_output); RUN_TEST(test_encode_small_buffer);
  RUN_TEST(test_decode_null_input); RUN_TEST(test_decode_truncated_header);
  RUN_TEST(test_decode_bad_magic); RUN_TEST(test_decode_future_version);
  RUN_TEST(test_decode_crc_mismatch); RUN_TEST(test_decode_trailing_byte);
  RUN_TEST(test_decode_oversized); RUN_TEST(test_invalid_heartbeat_channel);
  RUN_TEST(test_invalid_sensor_ownership); RUN_TEST(test_invalid_lamp_ownership);
  RUN_TEST(test_invalid_electrical_ownership); RUN_TEST(test_invalid_brightness);
  RUN_TEST(test_wrong_variant); RUN_TEST(test_lab_registry_valid);
  RUN_TEST(test_field_registry_valid); RUN_TEST(test_field_unencrypted_rejected);
  RUN_TEST(test_duplicate_node_rejected); RUN_TEST(test_duplicate_mac_rejected);
  RUN_TEST(test_zero_mac_rejected); RUN_TEST(test_broadcast_mac_rejected);
  RUN_TEST(test_registry_find_known); RUN_TEST(test_registry_reject_unknown);
  RUN_TEST(test_registry_source_match); RUN_TEST(test_registry_source_mismatch);
  RUN_TEST(test_bounded_queue_fifo); RUN_TEST(test_bounded_queue_overflow);
  RUN_TEST(test_bounded_queue_underflow); RUN_TEST(test_gateway_accepts_known_valid);
  RUN_TEST(test_gateway_unknown_mac_no_sequence); RUN_TEST(test_gateway_mismatch_no_sequence);
  RUN_TEST(test_gateway_invalid_no_sequence); RUN_TEST(test_gateway_sequence_exhaustion);
  RUN_TEST(test_gateway_pop_preserves_arrival); RUN_TEST(test_outbox_rejects_empty_topic);
  RUN_TEST(test_outbox_prioritizes_sensor); RUN_TEST(test_outbox_ack_removes_only_matching);
  RUN_TEST(test_outbox_retry_payload_immutable); RUN_TEST(test_outbox_max_four_attempts);
  RUN_TEST(test_outbox_rejected_send_is_bounded);
  RUN_TEST(test_outbox_disconnect_releases_puback_wait);
  RUN_TEST(test_readiness_all_true_online); RUN_TEST(test_readiness_wifi_false_offline);
  RUN_TEST(test_readiness_utc_false_offline); RUN_TEST(test_readiness_mqtt_false_offline);
  RUN_TEST(test_utc_reconstruction); RUN_TEST(test_utc_rejects_unready_clock);
  RUN_TEST(test_utc_monotonic_wrap); RUN_TEST(test_boot_counter_success);
  RUN_TEST(test_boot_counter_read_failure); RUN_TEST(test_boot_counter_write_failure);
  RUN_TEST(test_boot_counter_overflow); RUN_TEST(test_boot_counter_uses_documented_keys);
  return UNITY_END();
}
