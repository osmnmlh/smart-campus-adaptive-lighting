#pragma once

#include <cstdint>
#include <string>

namespace gateway_core {

class BootCounterStore {
 public:
  virtual ~BootCounterStore() = default;
  virtual bool read(const char* name_space, const char* key, std::uint32_t& value) = 0;
  virtual bool write(const char* name_space, const char* key, std::uint32_t value) = 0;
};

struct BootCounterResult {
  bool ok{false};
  std::uint32_t counter{0};
  std::string boot_id{};
};

BootCounterResult next_boot_counter(BootCounterStore& store);

constexpr const char* kBootCounterNamespace = "sc_gateway";
constexpr const char* kBootCounterKey = "boot_counter";

}  // namespace gateway_core
