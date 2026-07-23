#pragma once

#include <array>
#include <cstdint>

#include "smart_campus/identifiers.hpp"

namespace node_core {

struct LampSnapshot {
  smart_campus::LampId lamp_id{smart_campus::LampId::L1};
  smart_campus::LampOperatingState operating_state{
      smart_campus::LampOperatingState::STANDBY};
  std::uint8_t brightness_percent{30};
  std::uint8_t target_brightness_percent{30};
};

class LightingController {
 public:
  explicit LightingController(smart_campus::NodeId node);

  bool on_local_sensor(smart_campus::SensorId sensor, std::uint32_t now_ms);
  bool on_peer_sensor(smart_campus::NodeId source,
                      smart_campus::SensorId sensor, std::uint32_t now_ms);
  void update_ambient(float lux, bool measurement_valid,
                      std::uint32_t now_ms);
  void tick(std::uint32_t now_ms);

  LampSnapshot snapshot(smart_campus::LampId lamp) const;
  bool publish_requested(smart_campus::LampId lamp) const;
  void clear_publish_request(smart_campus::LampId lamp);
  bool take_publish_request(smart_campus::LampId lamp);
  std::uint8_t baseline_percent() const { return baseline_percent_; }

 private:
  struct Runtime {
    std::uint8_t brightness{30};
    std::uint8_t target{30};
    smart_campus::LampOperatingState state{
        smart_campus::LampOperatingState::STANDBY};
    std::uint32_t motion_refreshed_ms{0};
    std::uint32_t last_fade_ms{0};
    bool holding{false};
    bool publish_pending{true};
  };

  bool request_level(smart_campus::LampId lamp, std::uint8_t level,
                     smart_campus::LampOperatingState state,
                     std::uint32_t now_ms);
  bool owned(smart_campus::LampId lamp) const;
  Runtime& runtime(smart_campus::LampId lamp);
  const Runtime& runtime(smart_campus::LampId lamp) const;

  smart_campus::NodeId node_;
  std::uint8_t baseline_percent_{30};
  std::array<Runtime, 5> lamps_{};
};

}  // namespace node_core
