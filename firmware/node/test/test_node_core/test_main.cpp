#include <unity.h>

#include <array>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <limits>

#include "node_profiles.hpp"
#include "node_core/boot_counter.hpp"
#include "node_core/lighting_controller.hpp"
#include "node_core/node_state.hpp"
#include "node_core/peer_registry.hpp"
#include "node_core/tx_queue.hpp"
#include "smart_campus/wire_codec.hpp"

using smart_campus::LampId;
using smart_campus::LampOperatingState;
using smart_campus::MessageType;
using smart_campus::NodeId;
using smart_campus::SensorId;

void setUp() {}
void tearDown() {}

namespace {

class FakeStore : public node_core::BootCounterStore {
 public:
  bool read(const char*, const char*, std::uint32_t& output) override {
    if (!read_ok) return false;
    output = value;
    return true;
  }
  bool write(const char*, const char*, std::uint32_t next) override {
    if (!write_ok) return false;
    value = next;
    return true;
  }

  bool read_ok{true};
  bool write_ok{true};
  std::uint32_t value{0};
};

std::array<std::uint8_t, 8> sample_bytes(
    std::uint8_t seed = 1) {
  return {{seed, static_cast<std::uint8_t>(seed + 1), 3, 4, 5, 6, 7, 8}};
}

bool enqueue_sample(node_core::TxQueue& queue, MessageType type,
                    std::uint32_t sequence,
                    node_core::Destination destination =
                        node_core::Destination::GATEWAY,
                    std::uint8_t seed = 1) {
  const auto bytes = sample_bytes(seed);
  return queue.enqueue(bytes.data(), bytes.size(), type, sequence,
                       destination);
}

std::array<node_core::Peer, 3> valid_peers(bool encrypted = false) {
  return {{
      {node_core::PeerRole::GATEWAY, NodeId::NODE_1,
       {{0x02, 0, 0, 0, 0, 10}}, encrypted},
      {node_core::PeerRole::NODE, NodeId::NODE_2,
       {{0x02, 0, 0, 0, 0, 2}}, encrypted},
      {node_core::PeerRole::NODE, NodeId::NODE_3,
       {{0x02, 0, 0, 0, 0, 3}}, encrypted},
  }};
}

void test_all_profiles_are_valid() {
  TEST_ASSERT_TRUE(node_profiles::validate_profile(
      node_profiles::profile_for(NodeId::NODE_1)));
  TEST_ASSERT_TRUE(node_profiles::validate_profile(
      node_profiles::profile_for(NodeId::NODE_2)));
  TEST_ASSERT_TRUE(node_profiles::validate_profile(
      node_profiles::profile_for(NodeId::NODE_3)));
}

void test_profile_pin_maps_match_the_mvp() {
  const auto node1 = node_profiles::profile_for(NodeId::NODE_1);
  const auto node3 = node_profiles::profile_for(NodeId::NODE_3);
  TEST_ASSERT_EQUAL_UINT8(25, node1.sensors[0].pin);
  TEST_ASSERT_EQUAL_UINT8(26, node1.sensors[1].pin);
  TEST_ASSERT_EQUAL_UINT8(32, node1.lamps[0].pin);
  TEST_ASSERT_EQUAL_UINT8(33, node1.lamps[1].pin);
  TEST_ASSERT_EQUAL_UINT8(25, node3.sensors[0].pin);
  TEST_ASSERT_EQUAL_UINT8(33, node3.lamps[1].pin);
}

void test_node2_owns_the_only_i2c_capabilities() {
  const auto node2 = node_profiles::profile_for(NodeId::NODE_2);
  TEST_ASSERT_TRUE(node2.has_ambient_sensor);
  TEST_ASSERT_TRUE(node2.has_electrical_sensor);
  TEST_ASSERT_EQUAL_UINT8(21, node2.i2c_sda);
  TEST_ASSERT_EQUAL_UINT8(22, node2.i2c_scl);
  TEST_ASSERT_EQUAL_UINT8(1, node2.sensor_count);
  TEST_ASSERT_EQUAL_UINT8(1, node2.lamp_count);
}

void test_pwm_conversion_is_deterministic() {
  TEST_ASSERT_EQUAL_UINT8(0, node_core::brightness_to_pwm(0));
  TEST_ASSERT_EQUAL_UINT8(77, node_core::brightness_to_pwm(30));
  TEST_ASSERT_EQUAL_UINT8(153, node_core::brightness_to_pwm(60));
  TEST_ASSERT_EQUAL_UINT8(255, node_core::brightness_to_pwm(100));
}

void test_pwm_conversion_supports_active_low() {
  TEST_ASSERT_EQUAL_UINT8(255, node_core::brightness_to_pwm(0, false));
  TEST_ASSERT_EQUAL_UINT8(178, node_core::brightness_to_pwm(30, false));
  TEST_ASSERT_EQUAL_UINT8(0, node_core::brightness_to_pwm(100, false));
}

void test_node2_ambient_thresholds() {
  TEST_ASSERT_EQUAL_UINT8(
      30, node_core::ambient_baseline_percent(NodeId::NODE_2, 49.9F, true));
  TEST_ASSERT_EQUAL_UINT8(
      30, node_core::ambient_baseline_percent(NodeId::NODE_2, 50.0F, true));
  TEST_ASSERT_EQUAL_UINT8(
      30, node_core::ambient_baseline_percent(NodeId::NODE_2, 299.9F, true));
  TEST_ASSERT_EQUAL_UINT8(
      0, node_core::ambient_baseline_percent(NodeId::NODE_2, 300.0F, true));
}

void test_invalid_ambient_measurement_falls_back_to_standby() {
  TEST_ASSERT_EQUAL_UINT8(
      30, node_core::ambient_baseline_percent(
              NodeId::NODE_2, std::numeric_limits<float>::quiet_NaN(), true));
  TEST_ASSERT_EQUAL_UINT8(
      30, node_core::ambient_baseline_percent(NodeId::NODE_2, 500.0F, false));
}

void test_nodes_without_ambient_sensor_use_standby() {
  TEST_ASSERT_EQUAL_UINT8(
      30, node_core::ambient_baseline_percent(NodeId::NODE_1, 900.0F, true));
  TEST_ASSERT_EQUAL_UINT8(
      30, node_core::ambient_baseline_percent(NodeId::NODE_3, 900.0F, true));
}

void test_only_node2_accepts_electrical_measurements() {
  TEST_ASSERT_TRUE(node_core::valid_electrical_measurement(
      NodeId::NODE_2, 12.0F, 100.0F, 1200.0F));
  TEST_ASSERT_FALSE(node_core::valid_electrical_measurement(
      NodeId::NODE_1, 12.0F, 100.0F, 1200.0F));
}

void test_invalid_electrical_values_are_rejected() {
  TEST_ASSERT_FALSE(node_core::valid_electrical_measurement(
      NodeId::NODE_2, -1.0F, 1.0F, 1.0F));
  TEST_ASSERT_FALSE(node_core::valid_electrical_measurement(
      NodeId::NODE_2, 1.0F,
      std::numeric_limits<float>::quiet_NaN(), 1.0F));
}

void test_debounce_emits_one_rising_edge() {
  node_core::DebouncedInput input;
  TEST_ASSERT_EQUAL(node_core::DebounceEvent::NONE,
                    input.update(true, 100, 50));
  TEST_ASSERT_EQUAL(node_core::DebounceEvent::NONE,
                    input.update(true, 149, 50));
  TEST_ASSERT_EQUAL(node_core::DebounceEvent::RISING,
                    input.update(true, 150, 50));
  TEST_ASSERT_EQUAL(node_core::DebounceEvent::NONE,
                    input.update(true, 250, 50));
}

void test_debounce_emits_falling_after_stability() {
  node_core::DebouncedInput input(true);
  TEST_ASSERT_EQUAL(node_core::DebounceEvent::NONE,
                    input.update(false, 10, 50));
  TEST_ASSERT_EQUAL(node_core::DebounceEvent::FALLING,
                    input.update(false, 60, 50));
}

void test_debounce_rejects_a_short_glitch() {
  node_core::DebouncedInput input;
  input.update(true, 100, 50);
  input.update(false, 120, 50);
  TEST_ASSERT_EQUAL(node_core::DebounceEvent::NONE,
                    input.update(false, 200, 50));
  TEST_ASSERT_FALSE(input.active());
}

void test_debounce_handles_millis_rollover() {
  node_core::DebouncedInput input;
  input.update(true, std::numeric_limits<std::uint32_t>::max() - 20U, 50);
  TEST_ASSERT_EQUAL(node_core::DebounceEvent::RISING,
                    input.update(true, 30, 50));
}

void test_sequence_starts_at_one() {
  node_core::SequenceCounter counter;
  std::uint32_t sequence = 0;
  TEST_ASSERT_TRUE(counter.issue(sequence));
  TEST_ASSERT_EQUAL_UINT32(1, sequence);
}

void test_sequence_preview_does_not_consume() {
  node_core::SequenceCounter counter;
  std::uint32_t first = 0;
  std::uint32_t second = 0;
  TEST_ASSERT_TRUE(counter.peek_next(first));
  TEST_ASSERT_TRUE(counter.peek_next(second));
  TEST_ASSERT_EQUAL_UINT32(first, second);
  TEST_ASSERT_EQUAL_UINT32(0, counter.current());
}

void test_sequence_commit_requires_the_previewed_next_value() {
  node_core::SequenceCounter counter;
  TEST_ASSERT_FALSE(counter.commit(2));
  TEST_ASSERT_TRUE(counter.commit(1));
  TEST_ASSERT_EQUAL_UINT32(1, counter.current());
}

void test_sequence_overflow_fails_safely() {
  node_core::SequenceCounter counter;
  counter.set_for_test(std::numeric_limits<std::uint32_t>::max());
  std::uint32_t sequence = 0;
  TEST_ASSERT_FALSE(counter.issue(sequence));
}

void test_boot_counter_starts_at_one() {
  FakeStore store;
  const auto result = node_core::next_boot_counter(store);
  TEST_ASSERT_TRUE(result.ok);
  TEST_ASSERT_EQUAL_UINT32(1, result.counter);
  TEST_ASSERT_EQUAL_STRING("BOOT_00000001", result.boot_id.c_str());
}

void test_boot_counter_increments_existing_value() {
  FakeStore store;
  store.value = 41;
  const auto result = node_core::next_boot_counter(store);
  TEST_ASSERT_TRUE(result.ok);
  TEST_ASSERT_EQUAL_UINT32(42, result.counter);
}

void test_boot_counter_read_failure_is_safe() {
  FakeStore store;
  store.read_ok = false;
  TEST_ASSERT_FALSE(node_core::next_boot_counter(store).ok);
}

void test_boot_counter_write_failure_is_safe() {
  FakeStore store;
  store.write_ok = false;
  TEST_ASSERT_FALSE(node_core::next_boot_counter(store).ok);
}

void test_boot_counter_rejects_identifier_overflow() {
  FakeStore store;
  store.value = 99999999U;
  TEST_ASSERT_FALSE(node_core::next_boot_counter(store).ok);
}

void test_lighting_starts_at_standby_baseline() {
  node_core::LightingController controller(NodeId::NODE_1);
  const auto state = controller.snapshot(LampId::L1);
  TEST_ASSERT_EQUAL_UINT8(30, state.brightness_percent);
  TEST_ASSERT_EQUAL(LampOperatingState::STANDBY, state.operating_state);
}

void test_local_sensor_activates_its_lamp() {
  node_core::LightingController controller(NodeId::NODE_1);
  TEST_ASSERT_TRUE(controller.on_local_sensor(SensorId::IR1, 10));
  const auto state = controller.snapshot(LampId::L1);
  TEST_ASSERT_EQUAL_UINT8(100, state.brightness_percent);
  TEST_ASSERT_EQUAL(LampOperatingState::ACTIVE, state.operating_state);
}

void test_local_sensor_pre_lights_the_local_adjacent_lamp() {
  node_core::LightingController controller(NodeId::NODE_1);
  controller.on_local_sensor(SensorId::IR1, 10);
  const auto state = controller.snapshot(LampId::L2);
  TEST_ASSERT_EQUAL_UINT8(60, state.target_brightness_percent);
  TEST_ASSERT_EQUAL(LampOperatingState::PRE_LIGHT, state.operating_state);
}

void test_local_sensor_ownership_is_enforced() {
  node_core::LightingController controller(NodeId::NODE_1);
  TEST_ASSERT_FALSE(controller.on_local_sensor(SensorId::IR3, 10));
  TEST_ASSERT_EQUAL_UINT8(
      30, controller.snapshot(LampId::L1).brightness_percent);
}

void test_peer_sensor_pre_lights_only_physical_neighbor() {
  node_core::LightingController controller(NodeId::NODE_2);
  TEST_ASSERT_TRUE(
      controller.on_peer_sensor(NodeId::NODE_1, SensorId::IR2, 10));
  TEST_ASSERT_EQUAL_UINT8(
      60, controller.snapshot(LampId::L3).target_brightness_percent);
}

void test_peer_sensor_does_not_activate_unrelated_lamp() {
  node_core::LightingController controller(NodeId::NODE_3);
  TEST_ASSERT_FALSE(
      controller.on_peer_sensor(NodeId::NODE_1, SensorId::IR1, 10));
  TEST_ASSERT_EQUAL_UINT8(
      30, controller.snapshot(LampId::L4).target_brightness_percent);
}

void test_peer_sensor_claim_must_match_ownership() {
  node_core::LightingController controller(NodeId::NODE_2);
  TEST_ASSERT_FALSE(
      controller.on_peer_sensor(NodeId::NODE_3, SensorId::IR2, 10));
}

void test_motion_refreshes_the_hold_window() {
  node_core::LightingController controller(NodeId::NODE_1);
  controller.on_local_sensor(SensorId::IR1, 0);
  controller.on_local_sensor(SensorId::IR1, 20000);
  controller.tick(30000);
  TEST_ASSERT_EQUAL_UINT8(
      100, controller.snapshot(LampId::L1).target_brightness_percent);
  controller.tick(50000);
  TEST_ASSERT_EQUAL_UINT8(
      30, controller.snapshot(LampId::L1).target_brightness_percent);
}

void test_fade_uses_five_percent_steps() {
  node_core::LightingController controller(NodeId::NODE_1);
  controller.on_local_sensor(SensorId::IR1, 0);
  controller.tick(30000);
  controller.tick(30100);
  TEST_ASSERT_EQUAL_UINT8(
      95, controller.snapshot(LampId::L1).brightness_percent);
}

void test_fade_never_drops_below_baseline() {
  node_core::LightingController controller(NodeId::NODE_1);
  controller.on_local_sensor(SensorId::IR1, 0);
  controller.tick(30000);
  for (std::uint32_t now = 30100; now <= 32000; now += 100)
    controller.tick(now);
  TEST_ASSERT_EQUAL_UINT8(
      30, controller.snapshot(LampId::L1).brightness_percent);
}

void test_daylight_baseline_can_fade_to_off_on_node2() {
  node_core::LightingController controller(NodeId::NODE_2);
  controller.update_ambient(300.0F, true, 0);
  for (std::uint32_t now = 100; now <= 1000; now += 100)
    controller.tick(now);
  const auto state = controller.snapshot(LampId::L3);
  TEST_ASSERT_EQUAL_UINT8(0, state.brightness_percent);
  TEST_ASSERT_EQUAL(LampOperatingState::OFF, state.operating_state);
}

void test_invalid_lux_restores_safe_standby_baseline() {
  node_core::LightingController controller(NodeId::NODE_2);
  controller.update_ambient(400.0F, true, 0);
  controller.tick(100);
  controller.update_ambient(0.0F, false, 200);
  TEST_ASSERT_EQUAL_UINT8(30, controller.baseline_percent());
  TEST_ASSERT_EQUAL_UINT8(
      30, controller.snapshot(LampId::L3).target_brightness_percent);
}

void test_tx_queue_prefers_sensor_events() {
  node_core::TxQueue queue;
  TEST_ASSERT_TRUE(enqueue_sample(queue, MessageType::HEARTBEAT, 1));
  TEST_ASSERT_TRUE(enqueue_sample(queue, MessageType::SENSOR_EVENT, 2));
  TEST_ASSERT_EQUAL_UINT32(2, queue.begin_send()->sequence);
}

void test_tx_retry_preserves_exact_encoded_frame() {
  node_core::TxQueue queue;
  enqueue_sample(queue, MessageType::LAMP_STATE, 7,
                 node_core::Destination::GATEWAY, 42);
  const node_core::TxItem original = *queue.begin_send();
  queue.mark_send_result(false);
  const node_core::TxItem* retry = queue.begin_send();
  TEST_ASSERT_EQUAL_UINT32(original.sequence, retry->sequence);
  TEST_ASSERT_EQUAL_UINT8_ARRAY(original.bytes.data(), retry->bytes.data(),
                                original.length);
}

void test_tx_queue_drops_after_three_failed_attempts() {
  node_core::TxQueue queue;
  enqueue_sample(queue, MessageType::LAMP_STATE, 7);
  for (int attempt = 0; attempt < 3; ++attempt) {
    TEST_ASSERT_NOT_NULL(queue.begin_send());
    queue.mark_send_result(false);
  }
  TEST_ASSERT_TRUE(queue.empty());
}

void test_full_queue_evicts_oldest_heartbeat_first() {
  node_core::TxQueue queue;
  for (std::uint32_t sequence = 1;
       sequence <= node_core::TxQueue::kCapacity; ++sequence)
    enqueue_sample(queue, MessageType::HEARTBEAT, sequence);
  TEST_ASSERT_TRUE(queue.make_room(MessageType::SENSOR_EVENT, 2));
  TEST_ASSERT_EQUAL_UINT8(2, queue.available());
  TEST_ASSERT_EQUAL_UINT32(3, queue.at(0)->sequence);
}

void test_full_queue_evicts_electrical_after_heartbeat() {
  node_core::TxQueue queue;
  enqueue_sample(queue, MessageType::HEARTBEAT, 1);
  enqueue_sample(queue, MessageType::ELECTRICAL_MEASUREMENT, 2);
  for (std::uint32_t sequence = 3;
       sequence <= node_core::TxQueue::kCapacity; ++sequence)
    enqueue_sample(queue, MessageType::LAMP_STATE, sequence);
  TEST_ASSERT_TRUE(queue.make_room(MessageType::SENSOR_EVENT, 2));
  for (std::size_t index = 0; index < queue.size(); ++index) {
    TEST_ASSERT_NOT_EQUAL(MessageType::HEARTBEAT,
                          queue.at(index)->message_type);
    TEST_ASSERT_NOT_EQUAL(MessageType::ELECTRICAL_MEASUREMENT,
                          queue.at(index)->message_type);
  }
}

void test_full_high_priority_queue_rejects_lower_priority_without_eviction() {
  node_core::TxQueue queue;
  for (std::uint32_t sequence = 1;
       sequence <= node_core::TxQueue::kCapacity; ++sequence)
    enqueue_sample(queue, MessageType::SENSOR_EVENT, sequence);
  TEST_ASSERT_FALSE(queue.make_room(MessageType::LAMP_STATE, 1));
  TEST_ASSERT_EQUAL_UINT8(node_core::TxQueue::kCapacity, queue.size());
}

void test_same_sequence_and_bytes_can_target_multiple_peers() {
  node_core::TxQueue queue;
  enqueue_sample(queue, MessageType::SENSOR_EVENT, 11,
                 node_core::Destination::GATEWAY, 9);
  enqueue_sample(queue, MessageType::SENSOR_EVENT, 11,
                 node_core::Destination::NODE_2, 9);
  TEST_ASSERT_EQUAL_UINT32(queue.at(0)->sequence, queue.at(1)->sequence);
  TEST_ASSERT_EQUAL_UINT8_ARRAY(queue.at(0)->bytes.data(),
                                queue.at(1)->bytes.data(),
                                queue.at(0)->length);
}

void test_peer_registry_rejects_unknown_and_mismatched_sources() {
  const auto peers = valid_peers();
  const node_core::PeerRegistry registry(node_core::DeploymentMode::LAB,
                                         peers);
  TEST_ASSERT_TRUE(registry.valid());
  TEST_ASSERT_FALSE(registry.node_source_matches(
      {{0x02, 0, 0, 0, 0, 99}}, NodeId::NODE_2));
  TEST_ASSERT_FALSE(
      registry.node_source_matches(peers[1].mac, NodeId::NODE_3));
  TEST_ASSERT_TRUE(
      registry.node_source_matches(peers[1].mac, NodeId::NODE_2));
}

void test_peer_registry_enforces_unique_and_encrypted_field_peers() {
  auto duplicate = valid_peers();
  duplicate[2].mac = duplicate[1].mac;
  TEST_ASSERT_FALSE(node_core::PeerRegistry(
                        node_core::DeploymentMode::LAB, duplicate)
                        .valid());
  TEST_ASSERT_FALSE(node_core::PeerRegistry(
                        node_core::DeploymentMode::FIELD, valid_peers(false))
                        .valid());
  TEST_ASSERT_TRUE(node_core::PeerRegistry(
                       node_core::DeploymentMode::FIELD, valid_peers(true))
                       .valid());
}

void test_shared_codec_round_trips_a_node_sensor_event() {
  smart_campus::WireMessage message{};
  message.node_id = NodeId::NODE_1;
  message.message_type = MessageType::SENSOR_EVENT;
  message.boot_counter = 1;
  message.sequence = 1;
  message.uptime_ms = 100;
  message.payload = smart_campus::SensorEventPayload{
      SensorId::IR2, smart_campus::SensorState::ACTIVE,
      smart_campus::SensorEdge::RISING_EDGE, 100};
  std::array<std::uint8_t, smart_campus::kMaxWireBytes> bytes{};
  const auto encoded =
      smart_campus::encode_wire_message(message, bytes.data(), bytes.size());
  TEST_ASSERT_TRUE(encoded);
  const auto decoded =
      smart_campus::decode_wire_message(bytes.data(), encoded.bytes_written);
  TEST_ASSERT_TRUE(decoded);
  TEST_ASSERT_EQUAL(NodeId::NODE_1, decoded.message.node_id);
  TEST_ASSERT_EQUAL_UINT32(1, decoded.message.sequence);
}

}  // namespace

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_all_profiles_are_valid);
  RUN_TEST(test_profile_pin_maps_match_the_mvp);
  RUN_TEST(test_node2_owns_the_only_i2c_capabilities);
  RUN_TEST(test_pwm_conversion_is_deterministic);
  RUN_TEST(test_pwm_conversion_supports_active_low);
  RUN_TEST(test_node2_ambient_thresholds);
  RUN_TEST(test_invalid_ambient_measurement_falls_back_to_standby);
  RUN_TEST(test_nodes_without_ambient_sensor_use_standby);
  RUN_TEST(test_only_node2_accepts_electrical_measurements);
  RUN_TEST(test_invalid_electrical_values_are_rejected);
  RUN_TEST(test_debounce_emits_one_rising_edge);
  RUN_TEST(test_debounce_emits_falling_after_stability);
  RUN_TEST(test_debounce_rejects_a_short_glitch);
  RUN_TEST(test_debounce_handles_millis_rollover);
  RUN_TEST(test_sequence_starts_at_one);
  RUN_TEST(test_sequence_preview_does_not_consume);
  RUN_TEST(test_sequence_commit_requires_the_previewed_next_value);
  RUN_TEST(test_sequence_overflow_fails_safely);
  RUN_TEST(test_boot_counter_starts_at_one);
  RUN_TEST(test_boot_counter_increments_existing_value);
  RUN_TEST(test_boot_counter_read_failure_is_safe);
  RUN_TEST(test_boot_counter_write_failure_is_safe);
  RUN_TEST(test_boot_counter_rejects_identifier_overflow);
  RUN_TEST(test_lighting_starts_at_standby_baseline);
  RUN_TEST(test_local_sensor_activates_its_lamp);
  RUN_TEST(test_local_sensor_pre_lights_the_local_adjacent_lamp);
  RUN_TEST(test_local_sensor_ownership_is_enforced);
  RUN_TEST(test_peer_sensor_pre_lights_only_physical_neighbor);
  RUN_TEST(test_peer_sensor_does_not_activate_unrelated_lamp);
  RUN_TEST(test_peer_sensor_claim_must_match_ownership);
  RUN_TEST(test_motion_refreshes_the_hold_window);
  RUN_TEST(test_fade_uses_five_percent_steps);
  RUN_TEST(test_fade_never_drops_below_baseline);
  RUN_TEST(test_daylight_baseline_can_fade_to_off_on_node2);
  RUN_TEST(test_invalid_lux_restores_safe_standby_baseline);
  RUN_TEST(test_tx_queue_prefers_sensor_events);
  RUN_TEST(test_tx_retry_preserves_exact_encoded_frame);
  RUN_TEST(test_tx_queue_drops_after_three_failed_attempts);
  RUN_TEST(test_full_queue_evicts_oldest_heartbeat_first);
  RUN_TEST(test_full_queue_evicts_electrical_after_heartbeat);
  RUN_TEST(test_full_high_priority_queue_rejects_lower_priority_without_eviction);
  RUN_TEST(test_same_sequence_and_bytes_can_target_multiple_peers);
  RUN_TEST(test_peer_registry_rejects_unknown_and_mismatched_sources);
  RUN_TEST(test_peer_registry_enforces_unique_and_encrypted_field_peers);
  RUN_TEST(test_shared_codec_round_trips_a_node_sensor_event);
  return UNITY_END();
}
