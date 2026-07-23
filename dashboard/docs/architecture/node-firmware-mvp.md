# Node firmware MVP boundary

The lighting-node MVP is a local-control component, not a smaller gateway. One common
PlatformIO project at `firmware/node` produces `NODE_1`, `NODE_2`, and `NODE_3`
profiles. `GW_1` remains the only MQTT and backend bridge.

## Responsibility boundary

Each node owns its declared IR inputs and lamps according to the shared ownership
contract. Local motion immediately controls local PWM without waiting for ESP-NOW,
the gateway, MQTT, dashboard services, or Internet connectivity. Valid peer sensor
events can only request 60% pre-lighting for an immediately adjacent lamp owned by
the receiver.

Nodes never infer direction, route or rebroadcast peer messages, subscribe to
commands, create UTC timestamps, publish MQTT, calculate campus totals, or estimate
savings. Those concerns remain outside the firmware MVP.

## Data path

1. A polled and debounced local IR rising edge updates local lighting.
2. The originating node encodes one shared sensor-event frame with a boot-scoped
   sequence.
3. The exact frame is queued separately for `GW_1` and the other two nodes.
4. A peer accepts it only after MAC allowlist, claimed-node, CRC, payload, and
   ownership validation.
5. The peer may pre-light an owned adjacent lamp, but creates no new sensor event.
6. `GW_1` remains responsible for transforming accepted wire frames into backend
   telemetry.

Lamp state, heartbeat, and `NODE_2`/L3/`INA219_1` electrical measurements go only to
the gateway. Electrical fields are measured mV, mA, mW, and accumulated mWh; they are
not aggregate or savings metrics. Invalid measurement cycles create neither a frame
nor a sequence number.

## Availability and security

Lighting state machines continue when transmission initialization or delivery fails.
The bounded transmit queue favors motion data and caps each recipient at three
ESP-NOW attempts without application acknowledgements.

LAB builds use non-secret placeholder MACs and unencrypted peers for CI compilation.
FIELD builds require an ignored local secrets header with a static PMK and per-peer
LMKs. No field MAC address or key is stored in the repository.
