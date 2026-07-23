# ESP32 lighting node MVP

`firmware/node` is one common PlatformIO project compiled into three hardware
profiles. It owns local lighting even when the gateway, MQTT broker, or Internet is
unavailable. It does not contain routing, command, direction-estimation, UTC, or
gateway behavior.

## Profiles and wiring

All IR inputs default to active-high and all lamp outputs default to active-high PWM.
Override `SC_IR_ACTIVE_HIGH` or `SC_PWM_ACTIVE_HIGH` at build time when the electrical
interface is inverted. PWM uses independent LEDC channels at 5 kHz with 8-bit
resolution.

| CI / field environment | Node | Inputs | Lamp PWM outputs | I2C |
| --- | --- | --- | --- | --- |
| `node1-ci` / `node1-field` | `NODE_1` | IR1 GPIO25, IR2 GPIO26 | L1 GPIO32/ch0, L2 GPIO33/ch1 | none |
| `node2-ci` / `node2-field` | `NODE_2` | IR3 GPIO25 | L3 GPIO32/ch2 | SDA21, SCL22 |
| `node3-ci` / `node3-field` | `NODE_3` | IR4 GPIO25, IR5 GPIO26 | L4 GPIO32/ch3, L5 GPIO33/ch4 | none |

`NODE_2` alone initializes the BH1750 ambient sensor and the INA219 measurement point
named `INA219_1`. The INA219 represents L3 only. Its emitted electrical values use the
shared integer units: mV, mA, mW, and accumulated mWh.

## Local lighting behavior

- Canonical levels are OFF 0%, STANDBY 30%, PRE_LIGHT 60%, and ACTIVE 100%.
- A rising event on a node's own IR input activates the matching lamp and pre-lights
  only a physically adjacent lamp owned by that same node.
- A validated rising event from another registered node may pre-light only a locally
  owned, physically adjacent lamp. It is never rebroadcast.
- Motion refreshes a 30-second hold. The lamp then fades by five percentage points
  every 100 ms and never falls below its current baseline.
- `NODE_1` and `NODE_3` use a 30% baseline. `NODE_2` uses 0% at 300 lux or above and
  30% below 300 lux. Failed, non-finite, or unavailable lux input safely falls back to
  30%.
- IR inputs are polled and debounced for 50 ms; no GPIO ISR is used.

Lamp state is originated at startup, on operating-state or target changes, and when a
fade reaches its baseline. Intermediate fade steps update PWM but do not flood the
wire protocol.

## ESP-NOW transport

The node reuses `firmware/shared` identifiers, ownership checks, compact codec, CRC,
and payloads. A single boot-scoped sequence starts at 1 and is shared by sensor, lamp,
electrical, and heartbeat origins. Retries retain the exact encoded frame and
sequence.

The fixed 16-entry transmit queue prioritizes sensor events, then lamp states,
electrical measurements, and heartbeats. When space is required it drops the oldest
heartbeat first, then an old electrical measurement for higher-priority traffic.
Each destination gets at most three send attempts. There is no application
acknowledgement or persistent transmit queue.

Sensor events are sent to `GW_1` and both peer nodes. Lamp state, electrical
measurement, and five-second heartbeat frames are sent only to `GW_1`. A received
frame must pass length/CRC/codec validation, source allowlisting, claimed-node/MAC
matching, and shared ownership validation before it can influence local pre-lighting.

## Security modes

CI uses explicit `SC_LAB_BUILD` mode with documentation-only, locally administered
placeholder MAC addresses and unencrypted ESP-NOW peers. Do not deploy that mode.

Field mode requires static per-device MAC provisioning, one PMK, and per-peer LMKs.
Copy `include/node_secrets.example.hpp` to the ignored
`include/node_secrets.hpp` on a provisioning workstation and replace every
placeholder. The example values are not secrets and are not deployable. Field
profiles deliberately fail to compile when that ignored file is absent.

## Build and test

From the repository root:

```powershell
.\.venv-firmware\Scripts\pio.exe test -d firmware/node -e native
.\.venv-firmware\Scripts\pio.exe run -d firmware/node -e node1-ci
.\.venv-firmware\Scripts\pio.exe run -d firmware/node -e node2-ci
.\.venv-firmware\Scripts\pio.exe run -d firmware/node -e node3-ci
```

These commands test and compile only. They do not flash a board and do not open a
serial port. Hardware flashing, actual MAC/key provisioning, pin electrical
validation, sensor calibration, and end-to-end radio tests remain explicit field
steps. Manual field upload commands are in
`dashboard/docs/integration/hardware-mvp-bring-up.md`.
