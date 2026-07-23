# Dashboard backend

The NestJS backend exposes read-only REST endpoints and the native WebSocket endpoint at `/ws/v1`.
It starts in deterministic `SIMULATED` mode by default. Set `MQTT_ENABLED=true` to enable read-only
gateway telemetry ingestion through MQTT.js.

## MQTT ingestion

The backend connects to `MQTT_BROKER_URL` with a clean MQTT session, MQTT.js automatic reconnect,
and explicit idempotent QoS 1 subscriptions:

- `smart-campus/v1/nodes/+/+`
- `smart-campus/v1/gateways/+/status`

It does not subscribe to or publish command topics. Node messages must be QoS 1 and non-retained;
gateway status must be QoS 1 and retained. Shared V1 schemas validate topics, envelopes, identifiers,
ownership, message IDs, and typed payloads before any state change.

Accepted origin messages update the in-memory read model through `LiveReadModelUpdatePort` and publish
normalized typed events through the existing `RealtimePublisherPort`. Raw MQTT payloads, topics, and
gateway sequencing metadata are not forwarded to WebSocket clients.

Connection modes are:

- `SIMULATED`: MQTT is disabled.
- `DISCONNECTED`: MQTT is enabled but the broker is disconnected.
- `DEGRADED`: the broker is connected, but the gateway or at least one canonical node is not online.
- `LIVE`: broker connected, `GW_1` online, and `NODE_1` through `NODE_3` observed within the liveness
  window.

The shared communication policy uses a 5-second heartbeat interval and a 15-second offline timeout.
Every accepted node-origin message refreshes liveness; duplicates, stale messages, and invalid messages
do not. The production interval is isolated behind the liveness scheduler port.

See [MQTT ingestion pipeline](../docs/architecture/mqtt-ingestion-pipeline.md) for validation,
deduplication, ordering, diagnostics, and security boundaries.

## Local configuration

Copy values from the workspace `.env.example`. The defaults keep MQTT disabled:

```text
MQTT_ENABLED=false
MQTT_BROKER_URL=mqtt://127.0.0.1:1883
MQTT_CLIENT_ID=smart-campus-backend
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CONNECT_TIMEOUT_MS=5000
MQTT_RECONNECT_PERIOD_MS=1000
MQTT_KEEPALIVE_SECONDS=30
MQTT_MAX_PAYLOAD_BYTES=16384
MQTT_DEDUP_CAPACITY=10000
MQTT_LIVENESS_SWEEP_MS=5000
```

The repository Mosquitto configuration is anonymous and loopback-bound for local MVP development
only. Production requires `mqtts`, broker authentication, per-topic ACLs, and managed credentials.

## Validation

From the dashboard workspace:

```powershell
npm.cmd run lint --workspace=@smart-campus/backend
npm.cmd run typecheck --workspace=@smart-campus/backend
npm.cmd run test --workspace=@smart-campus/backend
npm.cmd run test:e2e --workspace=@smart-campus/backend
npm.cmd run build --workspace=@smart-campus/backend
```
