#pragma once

#include <array>
#include <cstddef>
#include <cstdint>

#include "smart_campus/identifiers.hpp"
#include "smart_campus/ownership.hpp"

namespace node_profiles {

struct SensorPin {
  smart_campus::SensorId id;
  std::uint8_t pin;
};

struct LampPin {
  smart_campus::LampId id;
  std::uint8_t pin;
  std::uint8_t pwm_channel;
};

struct NodeProfile {
  smart_campus::NodeId node_id;
  std::array<SensorPin, 2> sensors;
  std::size_t sensor_count;
  std::array<LampPin, 2> lamps;
  std::size_t lamp_count;
  bool has_ambient_sensor;
  bool has_electrical_sensor;
  std::uint8_t i2c_sda;
  std::uint8_t i2c_scl;
};

constexpr NodeProfile profile_for(smart_campus::NodeId node) {
  using smart_campus::LampId;
  using smart_campus::NodeId;
  using smart_campus::SensorId;
  if (node == NodeId::NODE_1) {
    return {node,
            {{{SensorId::IR1, 25}, {SensorId::IR2, 26}}},
            2,
            {{{LampId::L1, 32, 0}, {LampId::L2, 33, 1}}},
            2,
            false,
            false,
            0,
            0};
  }
  if (node == NodeId::NODE_2) {
    return {node,
            {{{SensorId::IR3, 25}, {SensorId::IR3, 25}}},
            1,
            {{{LampId::L3, 32, 2}, {LampId::L3, 32, 2}}},
            1,
            true,
            true,
            21,
            22};
  }
  return {NodeId::NODE_3,
          {{{SensorId::IR4, 25}, {SensorId::IR5, 26}}},
          2,
          {{{LampId::L4, 32, 3}, {LampId::L5, 33, 4}}},
          2,
          false,
          false,
          0,
          0};
}

constexpr bool validate_profile(const NodeProfile& profile) {
  if (!smart_campus::is_valid(profile.node_id) || profile.sensor_count == 0 ||
      profile.sensor_count > profile.sensors.size() || profile.lamp_count == 0 ||
      profile.lamp_count > profile.lamps.size())
    return false;
  for (std::size_t sensor = 0; sensor < profile.sensor_count; ++sensor) {
    if (!smart_campus::owns_sensor(profile.node_id, profile.sensors[sensor].id))
      return false;
    for (std::size_t lamp = 0; lamp < profile.lamp_count; ++lamp) {
      if (profile.sensors[sensor].pin == profile.lamps[lamp].pin) return false;
    }
  }
  for (std::size_t lamp = 0; lamp < profile.lamp_count; ++lamp) {
    if (!smart_campus::owns_lamp(profile.node_id, profile.lamps[lamp].id))
      return false;
    for (std::size_t other = lamp + 1; other < profile.lamp_count; ++other) {
      if (profile.lamps[lamp].pin == profile.lamps[other].pin ||
          profile.lamps[lamp].pwm_channel == profile.lamps[other].pwm_channel)
        return false;
    }
  }
  if (profile.has_ambient_sensor !=
          (profile.node_id == smart_campus::NodeId::NODE_2) ||
      profile.has_electrical_sensor !=
          smart_campus::owns_electrical_measurement(profile.node_id))
    return false;
  if (profile.has_ambient_sensor) {
    if (profile.i2c_sda == profile.i2c_scl) return false;
    for (std::size_t sensor = 0; sensor < profile.sensor_count; ++sensor) {
      if (profile.sensors[sensor].pin == profile.i2c_sda ||
          profile.sensors[sensor].pin == profile.i2c_scl)
        return false;
    }
    for (std::size_t lamp = 0; lamp < profile.lamp_count; ++lamp) {
      if (profile.lamps[lamp].pin == profile.i2c_sda ||
          profile.lamps[lamp].pin == profile.i2c_scl)
        return false;
    }
  }
  return true;
}

#if defined(SMART_CAMPUS_NODE_ID)
static_assert(SMART_CAMPUS_NODE_ID >= 1 && SMART_CAMPUS_NODE_ID <= 3,
              "SMART_CAMPUS_NODE_ID must be 1, 2, or 3");
constexpr auto kSelectedNode =
    static_cast<smart_campus::NodeId>(SMART_CAMPUS_NODE_ID);
constexpr NodeProfile kSelectedProfile = profile_for(kSelectedNode);
static_assert(validate_profile(kSelectedProfile), "Selected node profile is invalid");
#endif

}  // namespace node_profiles
