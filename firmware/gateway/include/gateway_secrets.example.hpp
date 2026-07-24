#pragma once

// Copy to gateway_secrets.hpp only on a provisioned field workstation.
// Never commit the copied file or real MAC addresses / PMK / LMKs.
#define SC_WIFI_SSID "replace-on-provisioning-host"
#define SC_WIFI_PASSWORD "replace-on-provisioning-host"
#define SC_MQTT_URI "mqtts://broker.example.invalid:8883"
#define SC_MQTT_USERNAME "replace-on-provisioning-host"
#define SC_MQTT_PASSWORD "replace-on-provisioning-host"
#define SC_NODE_1_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x10, 0x01}
#define SC_NODE_2_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x10, 0x02}
#define SC_NODE_3_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x10, 0x03}
#define SC_ESPNOW_PMK_BYTES \
  {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, \
   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}
#define SC_NODE_1_LMK_BYTES SC_ESPNOW_PMK_BYTES
#define SC_NODE_2_LMK_BYTES SC_ESPNOW_PMK_BYTES
#define SC_NODE_3_LMK_BYTES SC_ESPNOW_PMK_BYTES
