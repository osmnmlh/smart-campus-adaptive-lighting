#pragma once

#include <array>
#include <cstdint>
#include <cstdio>
#include <string>

namespace smart_campus {

enum class NodeId : std::uint8_t { NODE_1 = 1, NODE_2 = 2, NODE_3 = 3 };
enum class SensorId : std::uint8_t { IR1 = 1, IR2 = 2, IR3 = 3, IR4 = 4, IR5 = 5 };
enum class LampId : std::uint8_t { L1 = 1, L2 = 2, L3 = 3, L4 = 4, L5 = 5 };
enum class MessageType : std::uint8_t {
  HEARTBEAT = 1,
  SENSOR_EVENT = 2,
  LAMP_STATE = 3,
  ELECTRICAL_MEASUREMENT = 4,
};
enum class SensorState : std::uint8_t { INACTIVE = 0, ACTIVE = 1 };
enum class SensorEdge : std::uint8_t { NONE = 0, RISING_EDGE = 1, FALLING_EDGE = 2 };
enum class LampOperatingState : std::uint8_t {
  OFF = 0,
  STANDBY = 1,
  PRE_LIGHT = 2,
  ACTIVE = 3,
};
enum class LampHealth : std::uint8_t { HEALTHY = 0, WARNING = 1, FAULT = 2 };

using MacAddress = std::array<std::uint8_t, 6>;

constexpr bool is_valid(NodeId value) {
  return value >= NodeId::NODE_1 && value <= NodeId::NODE_3;
}

constexpr bool is_valid(MessageType value) {
  return value >= MessageType::HEARTBEAT && value <= MessageType::ELECTRICAL_MEASUREMENT;
}

constexpr const char* to_string(NodeId value) {
  switch (value) {
    case NodeId::NODE_1: return "NODE_1";
    case NodeId::NODE_2: return "NODE_2";
    case NodeId::NODE_3: return "NODE_3";
  }
  return "INVALID_NODE";
}

constexpr const char* to_string(MessageType value) {
  switch (value) {
    case MessageType::HEARTBEAT: return "HEARTBEAT";
    case MessageType::SENSOR_EVENT: return "SENSOR_EVENT";
    case MessageType::LAMP_STATE: return "LAMP_STATE";
    case MessageType::ELECTRICAL_MEASUREMENT: return "ELECTRICAL_MEASUREMENT";
  }
  return "INVALID_MESSAGE";
}

inline std::string format_boot_id(std::uint32_t counter) {
  if (counter == 0 || counter > 99999999U) return {};
  char value[14]{};
  std::snprintf(value, sizeof(value), "BOOT_%08lu", static_cast<unsigned long>(counter));
  return value;
}

inline std::string build_message_id(NodeId node, std::uint32_t boot_counter,
                                    std::uint32_t sequence) {
  if (!is_valid(node) || sequence == 0) return {};
  const std::string boot_id = format_boot_id(boot_counter);
  if (boot_id.empty()) return {};
  return std::string(to_string(node)) + ":" + boot_id + ":" + std::to_string(sequence);
}

}  // namespace smart_campus
