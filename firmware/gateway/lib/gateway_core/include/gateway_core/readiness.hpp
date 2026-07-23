#pragma once

#include <cstdint>

namespace gateway_core {

struct Readiness {
  bool wifi_connected{false};
  bool channel_aligned{false};
  bool esp_now_ready{false};
  bool peers_registered{false};
  bool utc_ready{false};
  bool mqtt_connected{false};
  bool online() const {
    return wifi_connected && channel_aligned && esp_now_ready && peers_registered &&
           utc_ready && mqtt_connected;
  }
};

constexpr bool valid_channel(std::uint8_t channel) {
  return channel >= 1 && channel <= 13;
}

bool reconstruct_received_epoch_ms(std::uint64_t current_epoch_ms,
                                   std::uint32_t current_monotonic_ms,
                                   std::uint32_t arrival_monotonic_ms,
                                   std::uint64_t& received_epoch_ms);

}  // namespace gateway_core
