#pragma once

#include <cstdint>

#if defined(SC_FIELD_BUILD) && defined(SC_LAB_BUILD)
#error "Select exactly one deployment mode"
#endif

#if defined(SC_FIELD_BUILD)
#if __has_include("node_secrets.hpp")
#include "node_secrets.hpp"
#else
#error "Field build requires ignored include/node_secrets.hpp; copy the example and provision it locally"
#endif
#define SC_NODE_ENCRYPTION_ENABLED 1
#elif defined(SC_LAB_BUILD)
#define SC_NODE_ENCRYPTION_ENABLED 0
#define SC_GATEWAY_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x00, 0x10}
#define SC_NODE_1_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x00, 0x01}
#define SC_NODE_2_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x00, 0x02}
#define SC_NODE_3_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x00, 0x03}
#else
#error "Define SC_LAB_BUILD or SC_FIELD_BUILD"
#endif

#ifndef SC_IR_ACTIVE_HIGH
#define SC_IR_ACTIVE_HIGH 1
#endif

#ifndef SC_PWM_ACTIVE_HIGH
#define SC_PWM_ACTIVE_HIGH 1
#endif

namespace node_config {

constexpr std::uint8_t kCommunicationChannel = 6;
static_assert(kCommunicationChannel >= 1 && kCommunicationChannel <= 13,
              "ESP-NOW channel must be in 1..13");
constexpr std::uint32_t kDebounceMs = 50;
constexpr std::uint32_t kMotionHoldMs = 30000;
constexpr std::uint32_t kFadeStepMs = 100;
constexpr std::uint8_t kFadeStepPercent = 5;
constexpr std::uint32_t kHeartbeatIntervalMs = 5000;
constexpr std::uint32_t kElectricalIntervalMs = 5000;
constexpr std::uint32_t kPwmFrequencyHz = 5000;
constexpr std::uint8_t kPwmResolutionBits = 8;
constexpr bool kIrActiveHigh = SC_IR_ACTIVE_HIGH != 0;
constexpr bool kPwmActiveHigh = SC_PWM_ACTIVE_HIGH != 0;

}  // namespace node_config
