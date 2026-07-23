#pragma once

// REFERENCE TEMPLATE ONLY. All values below are explicit non-deployable placeholders.
// Copy to firmware/gateway/include/gateway_secrets.hpp on a provisioning host.
// Canonical gateway identity: GW_1. Canonical Wi-Fi / ESP-NOW channel: 6.
#define SC_WIFI_SSID "REPLACE_WITH_2_4_GHZ_WIFI_SSID"
#define SC_WIFI_PASSWORD "REPLACE_WITH_WIFI_PASSWORD"

// Local controlled-LAN example: host 192.168.x.x, port 1883.
// Replace the entire URI; the literal below is intentionally not a valid address.
#define SC_MQTT_URI "mqtt://192.168.x.x:1883"
#define SC_MQTT_USERNAME "REPLACE_WITH_MQTT_USERNAME"
#define SC_MQTT_PASSWORD "REPLACE_WITH_MQTT_PASSWORD"

// Locally administered documentation placeholders, never field identities.
#define SC_NODE_1_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x20, 0x01}
#define SC_NODE_2_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x20, 0x02}
#define SC_NODE_3_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x20, 0x03}

// Replace every byte on the provisioning host.
#define SC_ESPNOW_PMK_BYTES \
  {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, \
   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}
#define SC_NODE_1_LMK_BYTES SC_ESPNOW_PMK_BYTES
#define SC_NODE_2_LMK_BYTES SC_ESPNOW_PMK_BYTES
#define SC_NODE_3_LMK_BYTES SC_ESPNOW_PMK_BYTES
