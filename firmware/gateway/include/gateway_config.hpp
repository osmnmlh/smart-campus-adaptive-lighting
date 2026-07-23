#pragma once

#include <cstdint>

#if defined(SC_FIELD_BUILD) && defined(SC_LAB_BUILD)
#error "Select exactly one deployment mode"
#endif

#if defined(SC_FIELD_BUILD)
#if __has_include("gateway_secrets.hpp")
#include "gateway_secrets.hpp"
#else
#error "Field build requires ignored include/gateway_secrets.hpp; copy the example and provision real values locally"
#endif
#define SC_FIELD_ENCRYPTION_ENABLED 1
#elif defined(SC_LAB_BUILD)
#define SC_FIELD_ENCRYPTION_ENABLED 0
#define SC_WIFI_SSID "SC_LAB_REPLACE_ME"
#define SC_WIFI_PASSWORD "SC_LAB_REPLACE_ME"
#define SC_MQTT_URI "mqtt://192.0.2.1:1883"
#define SC_MQTT_USERNAME ""
#define SC_MQTT_PASSWORD ""
#define SC_NODE_1_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x00, 0x01}
#define SC_NODE_2_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x00, 0x02}
#define SC_NODE_3_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x00, 0x03}
#else
#error "Define SC_LAB_BUILD or SC_FIELD_BUILD"
#endif

#ifndef SC_MQTT_USERNAME
#define SC_MQTT_USERNAME ""
#endif

#ifndef SC_MQTT_PASSWORD
#define SC_MQTT_PASSWORD ""
#endif

namespace gateway_config {

constexpr std::uint8_t kCommunicationChannel = 6;
static_assert(kCommunicationChannel >= 1 && kCommunicationChannel <= 13,
              "ESP-NOW/Wi-Fi channel must be in 1..13");
constexpr std::uint32_t kWifiRetryMs = 5000;
constexpr std::uint32_t kMqttRetryMs = 5000;
constexpr std::uint32_t kUtcRetryMs = 10000;
constexpr const char* kGatewayId = "GW_1";
constexpr const char* kStatusTopic = "smart-campus/v1/gateways/GW_1/status";

}  // namespace gateway_config
