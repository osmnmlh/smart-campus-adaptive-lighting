#pragma once

#include <Arduino.h>

#include "gateway_core/gateway_core.hpp"

namespace gateway_mqtt {

constexpr std::size_t kEnvelopeJsonCapacity = 1024;
constexpr std::size_t kStatusJsonCapacity = 512;

bool format_utc(std::uint64_t epoch_ms, char* output, std::size_t capacity);
bool serialize_envelope(const gateway_core::AcceptedFrame& frame,
                        const char* gateway_boot_id, const char* received_at,
                        String& topic, String& json);
bool serialize_status(const char* gateway_boot_id, const char* status,
                      std::uint32_t uptime_ms, std::uint8_t channel,
                      const char* published_at, String& json);

}  // namespace gateway_mqtt
