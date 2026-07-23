# ESP32 gateway firmware

`GW_1` is a visibility bridge from three autonomous ESP-NOW lighting nodes to MQTT.
Gateway loss must not affect local lighting control.

## Environments

| Environment      | Purpose                         | Encryption |
| ---------------- | ------------------------------- | ---------- |
| `native`         | Host-only core and codec tests  | N/A        |
| `esp32dev-ci`    | Compile-only lab build          | Explicitly unencrypted and non-deployable |
| `esp32dev-field` | Provisioned field compile       | Static PMK plus one LMK per allowlisted peer |

The CI MAC values and broker address are documentation-reserved placeholders. They
are not deployable identities. Copy `include/gateway_secrets.example.hpp` to the
ignored `include/gateway_secrets.hpp` only on a provisioning workstation. Never
commit that copy. Field builds without it fail at preprocessing.

## Runtime boundary

The ESP-NOW callback only validates pointer/length bounds, timestamps, copies into a
32-frame queue, and returns. MAC allowlisting, node-to-MAC matching, CRC, version,
ownership, range, and wire validation run outside the callback. Invalid, unauthorized,
or queue-overflow frames never consume a gateway sequence.

The wire format is explicitly little-endian and never serializes C++ struct memory:

| Offset | Field |
| ------ | ----- |
| 0..1   | `SC` magic |
| 2      | wire version (`1`) |
| 3      | node ID code |
| 4      | message type code |
| 5      | reserved (`0`) |
| 6..9   | NVS boot counter |
| 10..13 | node sequence |
| 14..17 | node uptime milliseconds |
| 18..19 | payload length |
| 20..   | typed payload |
| final 4 bytes | standard IEEE CRC-32 |

Gateway boot identity uses NVS namespace `sc_gateway`, key `boot_counter`. Increment,
write failure, zero, and eight-digit overflow enter a safe halt; IDs are never
truncated. Node message identity remains `nodeId:bootId:sequence`.

## Wi-Fi, time, and MQTT

Wi-Fi and ESP-NOW must use exactly the configured 1–13 channel. ESP-NOW and peer
registration do not proceed on a mismatch. Reconnect attempts are timer-driven and
non-blocking.

SNTP must establish a post-2020 UTC clock before MQTT starts. `receivedAt` is
reconstructed from current UTC minus monotonic time elapsed since callback arrival;
the firmware never publishes epoch/1970 placeholders. `ONLINE` requires Wi-Fi,
channel alignment, ESP-NOW, all peers, UTC, and MQTT.

Node messages use QoS 1 and are non-retained. Only the retained gateway birth/status
and retained `OFFLINE` Last Will use the gateway status topic. The LWT timestamp is
the time the will payload is prepared; it does not claim to be the later disconnect
time. The firmware subscribes to no topics and implements no commands.

The 64-entry outbox prioritizes sensor, lamp, electrical, then heartbeat data.
It removes an item only after the matching PUBACK and permits at most three retries
after the initial attempt. Topic, JSON payload, node identity, gateway sequence, and
`receivedAt` remain immutable across retry.

## Safe logging

Logs report only coarse state/rejection categories. They never print credentials,
key bytes, full MAC addresses, raw wire payloads, or MQTT JSON bodies.
