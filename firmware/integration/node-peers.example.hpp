#pragma once

// REFERENCE TEMPLATE ONLY. Copy to firmware/node/include/node_secrets.hpp on a
// provisioning host. CI profiles use LAB_UNENCRYPTED placeholders and do not include
// this file. node1-field/node2-field/node3-field require this FIELD configuration.

// Locally administered documentation placeholders, never field identities.
#define SC_GATEWAY_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x20, 0x10}
#define SC_NODE_1_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x20, 0x01}
#define SC_NODE_2_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x20, 0x02}
#define SC_NODE_3_MAC_BYTES {0x02, 0x00, 0x00, 0x00, 0x20, 0x03}

// FIELD requires one 16-byte PMK and a distinct per-peer 16-byte LMK.
// Zero-filled values are deliberate placeholders and must be replaced.
#define SC_ESPNOW_PMK_BYTES \
  {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, \
   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}
#define SC_GATEWAY_LMK_BYTES SC_ESPNOW_PMK_BYTES
#define SC_NODE_1_LMK_BYTES SC_ESPNOW_PMK_BYTES
#define SC_NODE_2_LMK_BYTES SC_ESPNOW_PMK_BYTES
#define SC_NODE_3_LMK_BYTES SC_ESPNOW_PMK_BYTES
