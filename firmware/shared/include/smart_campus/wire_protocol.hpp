#pragma once

#include <cstdint>
#include <variant>

#include "smart_campus/identifiers.hpp"

namespace smart_campus {

struct HeartbeatPayload {
  std::uint8_t firmware_major{0};
  std::uint8_t firmware_minor{0};
  std::uint8_t firmware_patch{0};
  std::uint8_t communication_channel{0};
};

struct SensorEventPayload {
  SensorId sensor_id{SensorId::IR1};
  SensorState state{SensorState::INACTIVE};
  SensorEdge edge{SensorEdge::NONE};
  std::uint32_t event_uptime_ms{0};
};

struct LampStatePayload {
  LampId lamp_id{LampId::L1};
  LampOperatingState operating_state{LampOperatingState::OFF};
  LampHealth health{LampHealth::HEALTHY};
  std::uint8_t brightness_percent{0};
  std::uint8_t target_brightness_percent{0};
  std::uint8_t pwm_duty_percent{0};
};

struct ElectricalMeasurementPayload {
  std::uint32_t voltage_mv{0};
  std::uint32_t current_ma{0};
  std::uint32_t power_mw{0};
  std::uint32_t energy_mwh{0};
};

using Payload = std::variant<HeartbeatPayload, SensorEventPayload, LampStatePayload,
                             ElectricalMeasurementPayload>;

struct WireMessage {
  NodeId node_id{NodeId::NODE_1};
  MessageType message_type{MessageType::HEARTBEAT};
  std::uint32_t boot_counter{0};
  std::uint32_t sequence{0};
  std::uint32_t uptime_ms{0};
  Payload payload{HeartbeatPayload{}};
};

}  // namespace smart_campus
