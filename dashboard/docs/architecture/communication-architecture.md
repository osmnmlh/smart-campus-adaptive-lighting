# Communication architecture freeze

Status: Implemented through gateway firmware foundation
Date: 2026-07-23

## Scope and flow

```text
Node ESP-NOW Envelope
  -> gateway validation and enrichment
  -> MQTT Envelope
  -> future backend MQTT validation
  -> future normalized domain event
  -> current read model
  -> future WebSocket client event
```

This phase defines only the first two versioned transport layers. Raw MQTT envelopes must never be forwarded directly to frontend clients. Existing lowercase domain IDs (`node-1`, `lamp-1`, `sensor-ir-1`) remain unchanged; transport-facing physical IDs are explicitly separate and map to `NODE_1`, `L1`, and `IR1` conventions.

## Topology and identity

`NODE_1`, `NODE_2`, and `NODE_3` retain autonomous local adaptive-lighting control. A fourth ESP32, `GW_1`, bridges ESP-NOW to 2.4 GHz Wi-Fi/MQTT; `NODE_2` is not the gateway. Gateway outage can remove dashboard visibility but cannot stop local lighting.

Every node boot session has an NVS-backed counter formatted as `BOOT_00000001`; sequence starts at 1 per boot and is node-local. The deduplication key and MQTT `messageId` is `nodeId:bootId:sequence`. Gateway acceptance order uses `gatewaySequence` and restart identity uses `gatewayBootId`; neither participates in node packet-loss or deduplication identity. Nodes provide `uptimeMs`, not UTC. `GW_1` adds explicit UTC `receivedAt`.

## V1 payloads

All envelopes require numeric `schemaVersion: 1`; missing, string, or future versions fail V1 parsing.

| Message type             | Purpose                                     | MQTT kind   |
| ------------------------ | ------------------------------------------- | ----------- |
| `HEARTBEAT`              | Last-seen signal, firmware version, channel | `heartbeat` |
| `SENSOR_EVENT`           | Raw IR edge; no occupant classification     | `events`    |
| `LAMP_STATE`             | Owned lamp state and `pwmDutyPercent`       | `events`    |
| `ELECTRICAL_MEASUREMENT` | Real INA219 sample from `NODE_2/L3`         | `telemetry` |

Direction remains a future normalized-domain concern. Node envelopes contain no gateway fields or mandatory UTC timestamp. Gateway envelopes preserve the node message and add `GW_1` metadata.

## Heartbeat, delivery, MQTT, and topics

Heartbeat interval is 5,000 ms; offline timeout is 15,000 ms (three missed windows). Heartbeat updates last-seen; backend ingestion calculates offline state. ESP-NOW callbacks are transport-result signals, not delivery guarantees. Non-blocking bounded retries are heartbeat 1, sensor/lamp 2, and electrical 1; there is no application ACK or infinite retry.

All messages use MQTT QoS 1; backend will deduplicate by `messageId`. QoS 2 is excluded.

| Topic                                            | Retained |
| ------------------------------------------------ | -------- |
| `smart-campus/v1/nodes/NODE_1/heartbeat`         | No       |
| `smart-campus/v1/nodes/NODE_1/events`            | No       |
| `smart-campus/v1/nodes/NODE_1/telemetry`         | No       |
| `smart-campus/v1/nodes/NODE_1/status`            | No       |
| `smart-campus/v1/gateways/GW_1/status` birth/LWT | Yes      |

Subscriptions will be `smart-campus/v1/nodes/+/+` and `smart-campus/v1/gateways/+/status`. Publish builders reject wildcards; no command topic exists.

## Channel and security

Gateway Wi-Fi and all ESP-NOW peers share one configured channel from 1–13. The access-point channel must be fixed or controlled; 1, 6, or 11 are deployment recommendations, not hard-coded constants. Field/demo mode requires static PMK/LMK encryption, uppercase MAC allowlisting, and node-to-MAC validation. Source stores only NVS key references, never key values or real MACs. Unencrypted transport is explicit `LAB` mode only. Provisioning, rotation, certificates, and full anti-replay are deferred.

## Energy provenance

The single INA219 is connected to `NODE_2`/`L3`. Its `voltageV`, `currentA`, `powerW`, and cumulative `energyWh` are `MEASURED`; the counter is scoped to boot/measurement session and may reset with `bootId`. `L1/L2/L4/L5` are future backend `ESTIMATED` values; totals and savings are `CALCULATED`. Coverage is 1/3 nodes and 1/5 lamps. The project must not claim the whole system is measured.

## Wire budget

The node-origin target is 220 UTF-8 bytes. Canonical logical JSON examples measure 177 bytes for heartbeat, 198 for sensor events, 259 for lamp state, and 275 for electrical measurement. Lamp and electrical JSON therefore exceed the target; firmware must use compact field mapping or another reviewed serialization without changing logical contract meaning. The tests report real byte counts rather than hiding this gap. CBOR/Protobuf/binary codecs are not added, and the larger MQTT envelope is outside this limit.

## Gateway firmware implementation boundary

The gateway foundation now implements a real compile-time ESP32 path using Arduino,
ESP-NOW, Wi-Fi/SNTP, and the ESP-IDF MQTT client. The receive callback is copy-only
and bounded; portable core code performs allowlist, source-node, wire-version,
payload, ownership, CRC, and queue validation. A valid accepted frame receives the
next gateway sequence only after queue capacity is confirmed.

The binary wire protocol is explicitly little-endian and capped at 220 bytes. It
uses typed heartbeat, sensor, lamp, and measured-electrical payloads with a trailing
IEEE CRC-32. Firmware-generated MQTT JSON preserves the V1 logical contract and is
covered by package-root TypeScript schema fixtures. Gateway JSON output is capped at
1,024 bytes and status JSON at 512 bytes.

The gateway outbox is bounded to 64 immutable entries, prioritizes sensor, lamp,
electrical, then heartbeat, publishes QoS 1, and removes only the PUBACK-matched
entry. Three retries beyond the initial attempt are allowed. Node topics are never
retained; gateway birth and LWT remain retained. There are no subscriptions.

Lab builds are explicitly unencrypted and non-deployable. Field builds require an
ignored local secrets header, static PMK, one LMK per peer, exactly three allowlisted
MAC addresses, and matching node identities. No real MAC or key value is committed.

## Out of scope

Real broker/hardware execution, actual PMK/LMK provisioning, dynamic key rotation,
authentication, authorization, device commands, PostgreSQL, full anti-replay,
certificates, OTA, energy analytics UI, and vehicle/person/bicycle classification
remain out of scope.
