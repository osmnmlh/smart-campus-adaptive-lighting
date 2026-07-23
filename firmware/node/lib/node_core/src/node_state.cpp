#include "node_core/node_state.hpp"

#include <cmath>
#include <limits>

#include "smart_campus/ownership.hpp"

namespace node_core {

bool SequenceCounter::peek_next(std::uint32_t& sequence) const {
  if (current_ == std::numeric_limits<std::uint32_t>::max()) return false;
  sequence = current_ + 1U;
  return true;
}

bool SequenceCounter::commit(std::uint32_t sequence) {
  if (sequence == 0 || sequence != current_ + 1U) return false;
  current_ = sequence;
  return true;
}

bool SequenceCounter::issue(std::uint32_t& sequence) {
  return peek_next(sequence) && commit(sequence);
}

DebounceEvent DebouncedInput::update(bool active, std::uint32_t now_ms,
                                     std::uint32_t debounce_ms) {
  if (active != candidate_) {
    candidate_ = active;
    candidate_since_ms_ = now_ms;
    return DebounceEvent::NONE;
  }
  if (candidate_ == stable_ || now_ms - candidate_since_ms_ < debounce_ms)
    return DebounceEvent::NONE;
  stable_ = candidate_;
  return stable_ ? DebounceEvent::RISING : DebounceEvent::FALLING;
}

std::uint8_t brightness_to_pwm(std::uint8_t brightness_percent,
                               bool active_high) {
  const std::uint8_t bounded =
      brightness_percent > 100 ? 100 : brightness_percent;
  const std::uint16_t duty =
      static_cast<std::uint16_t>((static_cast<std::uint16_t>(bounded) * 255U +
                                  50U) /
                                 100U);
  return active_high ? static_cast<std::uint8_t>(duty)
                     : static_cast<std::uint8_t>(255U - duty);
}

std::uint8_t ambient_baseline_percent(smart_campus::NodeId node, float lux,
                                      bool measurement_valid) {
  if (node != smart_campus::NodeId::NODE_2) return 30;
  if (!measurement_valid || !std::isfinite(lux)) return 30;
  return lux >= 300.0F ? 0 : 30;
}

bool valid_electrical_measurement(smart_campus::NodeId node, float voltage_v,
                                  float current_ma, float power_mw) {
  return smart_campus::owns_electrical_measurement(node) &&
         std::isfinite(voltage_v) && std::isfinite(current_ma) &&
         std::isfinite(power_mw) && voltage_v >= 0.0F &&
         current_ma >= 0.0F && power_mw >= 0.0F;
}

}  // namespace node_core
