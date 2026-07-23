#include "node_core/lighting_controller.hpp"

#include <algorithm>

#include "node_core/node_state.hpp"
#include "smart_campus/ownership.hpp"

namespace node_core {
namespace {

constexpr std::uint32_t kMotionHoldMs = 30000;
constexpr std::uint32_t kFadeStepMs = 100;
constexpr std::uint8_t kFadeStepPercent = 5;

smart_campus::LampId lamp_for_sensor(smart_campus::SensorId sensor) {
  return static_cast<smart_campus::LampId>(
      static_cast<std::uint8_t>(sensor));
}

bool adjacent(smart_campus::LampId lamp, smart_campus::SensorId sensor) {
  const int lamp_number = static_cast<int>(lamp);
  const int sensor_number = static_cast<int>(sensor);
  return lamp_number == sensor_number - 1 ||
         lamp_number == sensor_number + 1;
}

smart_campus::LampOperatingState baseline_state(std::uint8_t baseline) {
  return baseline == 0 ? smart_campus::LampOperatingState::OFF
                       : smart_campus::LampOperatingState::STANDBY;
}

}  // namespace

LightingController::LightingController(smart_campus::NodeId node) : node_(node) {
  for (std::uint8_t number = 1; number <= 5; ++number) {
    const auto lamp = static_cast<smart_campus::LampId>(number);
    if (!owned(lamp)) lamps_[number - 1].publish_pending = false;
  }
}

bool LightingController::owned(smart_campus::LampId lamp) const {
  return smart_campus::owns_lamp(node_, lamp);
}

LightingController::Runtime& LightingController::runtime(
    smart_campus::LampId lamp) {
  return lamps_[static_cast<std::uint8_t>(lamp) - 1U];
}

const LightingController::Runtime& LightingController::runtime(
    smart_campus::LampId lamp) const {
  return lamps_[static_cast<std::uint8_t>(lamp) - 1U];
}

bool LightingController::request_level(
    smart_campus::LampId lamp, std::uint8_t level,
    smart_campus::LampOperatingState state, std::uint32_t now_ms) {
  if (!owned(lamp)) return false;
  Runtime& value = runtime(lamp);
  const bool changed = value.target != level || value.state != state;
  value.target = level;
  value.state = state;
  value.motion_refreshed_ms = now_ms;
  value.holding = true;
  if (value.brightness < level) value.brightness = level;
  if (changed) value.publish_pending = true;
  return true;
}

bool LightingController::on_local_sensor(smart_campus::SensorId sensor,
                                         std::uint32_t now_ms) {
  if (!smart_campus::owns_sensor(node_, sensor)) return false;
  request_level(lamp_for_sensor(sensor), 100,
                smart_campus::LampOperatingState::ACTIVE, now_ms);
  for (std::uint8_t number = 1; number <= 5; ++number) {
    const auto lamp = static_cast<smart_campus::LampId>(number);
    if (owned(lamp) && adjacent(lamp, sensor) &&
        runtime(lamp).target < 60) {
      request_level(lamp, 60, smart_campus::LampOperatingState::PRE_LIGHT,
                    now_ms);
    }
  }
  return true;
}

bool LightingController::on_peer_sensor(smart_campus::NodeId source,
                                        smart_campus::SensorId sensor,
                                        std::uint32_t now_ms) {
  if (source == node_ || !smart_campus::owns_sensor(source, sensor))
    return false;
  bool affected = false;
  for (std::uint8_t number = 1; number <= 5; ++number) {
    const auto lamp = static_cast<smart_campus::LampId>(number);
    if (owned(lamp) && adjacent(lamp, sensor) &&
        runtime(lamp).target < 60) {
      affected |= request_level(
          lamp, 60, smart_campus::LampOperatingState::PRE_LIGHT, now_ms);
    }
  }
  return affected;
}

void LightingController::update_ambient(float lux, bool measurement_valid,
                                        std::uint32_t now_ms) {
  const std::uint8_t next =
      ambient_baseline_percent(node_, lux, measurement_valid);
  if (next == baseline_percent_) return;
  baseline_percent_ = next;
  for (std::uint8_t number = 1; number <= 5; ++number) {
    const auto lamp = static_cast<smart_campus::LampId>(number);
    if (!owned(lamp)) continue;
    Runtime& value = runtime(lamp);
    if (!value.holding) {
      value.target = next;
      value.state = baseline_state(next);
      value.last_fade_ms = now_ms;
      value.publish_pending = true;
    }
  }
}

void LightingController::tick(std::uint32_t now_ms) {
  for (std::uint8_t number = 1; number <= 5; ++number) {
    const auto lamp = static_cast<smart_campus::LampId>(number);
    if (!owned(lamp)) continue;
    Runtime& value = runtime(lamp);
    if (value.holding &&
        now_ms - value.motion_refreshed_ms >= kMotionHoldMs) {
      value.holding = false;
      value.target = baseline_percent_;
      value.state = baseline_state(baseline_percent_);
      value.last_fade_ms = now_ms;
      value.publish_pending = true;
    }
    if (!value.holding && value.brightness > value.target &&
        now_ms - value.last_fade_ms >= kFadeStepMs) {
      value.last_fade_ms = now_ms;
      const std::uint8_t difference = value.brightness - value.target;
      value.brightness = difference <= kFadeStepPercent
                             ? value.target
                             : static_cast<std::uint8_t>(
                                   value.brightness - kFadeStepPercent);
      if (value.brightness == value.target) value.publish_pending = true;
    } else if (!value.holding && value.brightness < value.target) {
      value.brightness = value.target;
      value.publish_pending = true;
    }
  }
}

LampSnapshot LightingController::snapshot(smart_campus::LampId lamp) const {
  const Runtime& value = runtime(lamp);
  return {lamp, value.state, value.brightness, value.target};
}

bool LightingController::take_publish_request(smart_campus::LampId lamp) {
  const bool pending = publish_requested(lamp);
  clear_publish_request(lamp);
  return pending;
}

bool LightingController::publish_requested(
    smart_campus::LampId lamp) const {
  return owned(lamp) && runtime(lamp).publish_pending;
}

void LightingController::clear_publish_request(
    smart_campus::LampId lamp) {
  if (!owned(lamp)) return;
  runtime(lamp).publish_pending = false;
}

}  // namespace node_core
