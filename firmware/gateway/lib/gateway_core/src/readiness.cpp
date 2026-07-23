#include "gateway_core/readiness.hpp"

namespace gateway_core {

bool reconstruct_received_epoch_ms(std::uint64_t current_epoch_ms,
                                   std::uint32_t current_monotonic_ms,
                                   std::uint32_t arrival_monotonic_ms,
                                   std::uint64_t& received_epoch_ms) {
  constexpr std::uint64_t kEarliestValidUtcMs = 1577836800000ULL;
  if (current_epoch_ms < kEarliestValidUtcMs) return false;
  const std::uint32_t elapsed = current_monotonic_ms - arrival_monotonic_ms;
  if (elapsed > current_epoch_ms) return false;
  received_epoch_ms = current_epoch_ms - elapsed;
  return true;
}

}  // namespace gateway_core
