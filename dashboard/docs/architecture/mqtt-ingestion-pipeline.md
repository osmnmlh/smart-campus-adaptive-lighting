# MQTT telemetry ingestion pipeline

## Purpose

This phase adds a read-only telemetry path from the canonical gateway through Mosquitto to the
dashboard backend:

```text
ESP32 nodes -> gateway -> Mosquitto -> MQTT.js adapter -> ingestion service
  -> live read-model port -> typed realtime publisher -> native WebSocket clients
```

The backend accepts device observations only. It has no MQTT application publish path, command topic,
device command REST route, firmware logic, historical persistence, or PostgreSQL integration.

## Connection and subscriptions

`MQTT_ENABLED=false` preserves the deterministic fixture behavior and opens no broker connection.
When enabled, the MQTT.js infrastructure adapter uses:

- a clean session;
- configured client ID, connect timeout, keepalive, and reconnect period;
- MQTT.js automatic reconnect;
- `resubscribe=false`, followed by explicit idempotent subscriptions after every connection;
- graceful client shutdown.

The exact QoS 1 subscription allowlist is:

```text
smart-campus/v1/nodes/+/+
smart-campus/v1/gateways/+/status
```

The backend never subscribes to `smart-campus/#` or to command topics. A broker connection failure
does not prevent REST or WebSocket startup; MQTT.js retries in the background.

## Validation pipeline

Each inbound packet passes the following ordered gates:

1. MQTT enabled state.
2. Byte length against `MQTT_MAX_PAYLOAD_BYTES` before decoding.
3. Shared V1 topic parsing and the exact topic allowlist.
4. Fatal UTF-8 decoding and JSON object parsing.
5. Shared runtime schema validation.
6. Topic node/gateway ID and topic-kind/message-type cross-validation.
7. QoS and retain policy.
8. Canonical gateway, node, sensor, and lamp ownership refinements.
9. Canonical `messageId` validation by the shared gateway-envelope schema.
10. Origin-message deduplication.
11. Node boot, sequence, and uptime ordering.
12. Read-model mutation through `LiveReadModelUpdatePort`.
13. Normalized event publication through `RealtimePublisherPort`.
14. Safe diagnostics.

A rejected packet cannot update last-seen state, enter the deduplication cache, mutate the read model,
or produce a realtime entity update. Logs contain safe reason codes and canonical identifiers, never
raw payloads, passwords, or credential-bearing URLs.

## QoS and retain policy

Node heartbeat, event, and telemetry packets must use QoS 1 and must not be retained. Gateway status
must use QoS 1 and be retained, allowing retained `ONLINE` state and retained `OFFLINE` Last Will
state. MQTT's DUP flag is not an error: origin `messageId` deduplication decides whether a delivery is
new.

## Gateway envelope and deduplication

Node topics contain the shared `GatewayMqttEnvelopeV1`. The gateway identity is `GW_1`, and topic
node ID, payload node ID, message type, topic kind, boot IDs, sequences, ownership, and
`nodeId:bootId:sequence` message ID must agree.

The bounded in-memory deduplication store is keyed only by origin `messageId`. It fingerprints a
stable, recursively key-sorted projection of the node message with SHA-256:

- same ID and same canonical node message: ignore without mutation or realtime event;
- same ID and different canonical node message: reject as a conflicting duplicate and emit only a
  safe communication diagnostic;
- capacity overflow: evict the oldest entry deterministically.

Gateway sequence and `receivedAt` are intentionally excluded, so a gateway redelivery cannot create
a second origin update.

## Ordering and recovery

Node ordering is authoritative. Boot counters are compared numerically rather than lexically. Within
one boot, sequence and uptime cannot move backward. A higher boot counter starts a restart session;
sequence one is expected, while another starting sequence is accepted with an explicit diagnostic.
A lower boot or stale sequence is rejected.

A forward sequence gap is accepted so the newest valid observation is not lost. The cumulative gap
count increases and communication becomes `DEGRADED`. Three consecutive normal sequences in the same
boot recover communication to `HEALTHY`. Gap and recovery alerts/logs use deterministic identifiers.

Gateway boot and sequence have a separate diagnostic tracker. Gateway gaps and stale deliveries do
not become node packet-loss facts and do not independently reject a valid node-origin update.
Gateway sequence values are not exposed in frontend entity events.

## Liveness and connection mode

Every accepted node-origin message refreshes backend-ingestion last-seen time. Gateway timestamps are
not used as liveness authority. Duplicate, invalid, stale, or conflicting messages do not refresh it.

The shared policy is:

- heartbeat interval: 5,000 ms;
- offline timeout: 15,000 ms;
- missed-heartbeat threshold: 3.

A scheduler port keeps business logic timer-free; only the production scheduler adapter owns
`setInterval`. At the timeout, an online node transitions offline once, producing a normalized node
event plus deduplicated alert/log diagnostics. Later valid traffic recovers it once. Node offline does
not switch lamps off or change lamp device health.

Broker, gateway, and node states remain independent:

- `SIMULATED`: MQTT disabled;
- `DISCONNECTED`: MQTT enabled and broker disconnected;
- `DEGRADED`: broker connected, but gateway is not online or any canonical node is unseen/offline;
- `LIVE`: broker connected, `GW_1` online, and all three canonical nodes online.

Gateway `ONLINE` never makes nodes online. Gateway `OFFLINE` does not immediately mark nodes offline;
the liveness timeout remains authoritative. Broker disconnection preserves the last accepted read
model while changing the connection mode to `DISCONNECTED`.

## Read model and realtime normalization

The MQTT application layer cannot access in-memory repository internals. It calls
`LiveReadModelUpdatePort`, whose current adapter validates defensive copies before storage:

- heartbeat updates node online state, firmware, uptime, last seen, and communication counters;
- sensor event updates the canonical owned IR sensor;
- lamp state updates operating state, health, brightness, target brightness, and PWM duty;
- electrical measurement updates only `NODE_2` / `L3` / `INA219_1` with `MEASURED` voltage, current,
  power, and energy values.

No estimated electrical values or energy-savings totals are invented.

Accepted changes use the existing `RealtimePublisherPort` and bounded replay stream. Events are
typed `NODE_UPDATED`, `SENSOR_UPDATED`, `LAMP_UPDATED`, `ALERT_UPSERTED`, `LOG_APPENDED`, or
`SYSTEM_CONNECTION_UPDATED`. Raw MQTT envelopes, payloads, topics, packet metadata, and gateway
sequence data are not forwarded to native WebSocket clients.

## Security and deferred work

Canonical IDs, shared runtime schemas, topic allowlisting, ownership refinements, message IDs, and
sequence checks provide validation and basic replay resistance. They are not cryptographic device
identity or complete anti-replay security.

The existing anonymous Mosquitto broker is for loopback-bound local MVP development only. Production
must add `mqtts`, broker authentication, managed credentials, device identity, and least-privilege
topic ACLs. TLS provisioning, authentication, authorization, persistence, and PostgreSQL are deferred.
Gateway and node firmware begin in the next phase.
