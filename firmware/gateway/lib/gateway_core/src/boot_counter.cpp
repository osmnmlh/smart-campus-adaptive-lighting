#include "gateway_core/boot_counter.hpp"

#include "smart_campus/identifiers.hpp"

namespace gateway_core {

BootCounterResult next_boot_counter(BootCounterStore& store) {
  std::uint32_t current = 0;
  if (!store.read(kBootCounterNamespace, kBootCounterKey, current)) return {};
  if (current >= 99999999U) return {};
  const std::uint32_t next = current + 1U;
  if (!store.write(kBootCounterNamespace, kBootCounterKey, next)) return {};
  return {true, next, smart_campus::format_boot_id(next)};
}

}  // namespace gateway_core
