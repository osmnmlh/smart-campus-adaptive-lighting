#pragma once

#include <cstdint>

#include "smart_campus/identifiers.hpp"

namespace node_core {

class SequenceCounter {
 public:
  bool peek_next(std::uint32_t& sequence) const;
  bool commit(std::uint32_t sequence);
  bool issue(std::uint32_t& sequence);
  std::uint32_t current() const { return current_; }
  void set_for_test(std::uint32_t value) { current_ = value; }

 private:
  std::uint32_t current_{0};
};

enum class DebounceEvent { NONE, BECAME_ACTIVE, BECAME_INACTIVE };

class DebouncedInput {
 public:
  explicit DebouncedInput(bool initial_active = false)
      : stable_(initial_active), candidate_(initial_active) {}
  DebounceEvent update(bool active, std::uint32_t now_ms,
                       std::uint32_t debounce_ms);
  bool active() const { return stable_; }

 private:
  bool stable_;
  bool candidate_;
  std::uint32_t candidate_since_ms_{0};
};

std::uint8_t brightness_to_pwm(std::uint8_t brightness_percent,
                               bool active_high = true);
std::uint8_t ambient_baseline_percent(smart_campus::NodeId node, float lux,
                                      bool measurement_valid);
bool valid_electrical_measurement(smart_campus::NodeId node, float voltage_v,
                                  float current_ma, float power_mw);

}  // namespace node_core
