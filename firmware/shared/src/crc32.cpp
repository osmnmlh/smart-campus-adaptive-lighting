#include "smart_campus/crc32.hpp"

namespace smart_campus {

std::uint32_t crc32(const std::uint8_t* data, std::size_t length) {
  std::uint32_t value = 0xFFFFFFFFU;
  for (std::size_t index = 0; index < length; ++index) {
    value ^= data[index];
    for (std::uint8_t bit = 0; bit < 8; ++bit) {
      value = (value >> 1U) ^ (0xEDB88320U & (0U - (value & 1U)));
    }
  }
  return value ^ 0xFFFFFFFFU;
}

}  // namespace smart_campus
