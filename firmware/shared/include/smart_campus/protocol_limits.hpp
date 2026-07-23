#pragma once

#include <cstddef>
#include <cstdint>

namespace smart_campus {

constexpr std::uint8_t kWireVersion = 1;
constexpr std::size_t kWireHeaderBytes = 20;
constexpr std::size_t kWireCrcBytes = 4;
constexpr std::size_t kMaxWireBytes = 220;
constexpr std::size_t kMaxPayloadBytes = kMaxWireBytes - kWireHeaderBytes - kWireCrcBytes;
constexpr std::size_t kGatewayReceiveQueueCapacity = 32;
constexpr std::size_t kGatewayOutboxCapacity = 64;
constexpr std::uint8_t kMqttQos = 1;
constexpr std::uint8_t kMaxPublishRetries = 3;
constexpr std::uint8_t kMaxPublishAttempts = 1 + kMaxPublishRetries;

}  // namespace smart_campus
