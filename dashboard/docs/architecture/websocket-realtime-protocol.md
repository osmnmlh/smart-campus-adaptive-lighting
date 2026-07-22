# WebSocket realtime protocol v1

## Scope

The NestJS backend exposes a native WebSocket endpoint at `/ws/v1`. It complements the read-only
REST API and broadcasts runtime-validated dashboard domain events without introducing Socket.IO,
SSE, MQTT ingestion, persistence, authentication, authorization, client commands, or a periodic
heartbeat. Data remains deterministic and explicitly marked `SIMULATED`.

Production and e2e bootstrap both install the same Nest `WsAdapter` helper. The adapter applies
the configured path, origin policy, and `ws` maximum payload limit before the gateway handles an
application message.

## Configuration

| Environment variable          | Default                 | Validation                                                           |
| ----------------------------- | ----------------------- | -------------------------------------------------------------------- |
| `WEBSOCKET_PATH`              | `/ws/v1`                | Absolute path without query, fragment, whitespace, or trailing slash |
| `WEBSOCKET_ALLOWED_ORIGINS`   | `http://localhost:3000` | Comma-separated exact HTTP(S) origins; no wildcard                   |
| `WEBSOCKET_MAX_PAYLOAD_BYTES` | `16384`                 | Integer from 1 through 1,048,576                                     |
| `WEBSOCKET_REPLAY_CAPACITY`   | `200`                   | Integer from 1 through 10,000                                        |

The handshake must include an `Origin` header that exactly equals one configured origin. Missing
origins, case changes, suffix/prefix attacks, paths, and unconfigured origins are rejected.

## Identity and ordering

Protocol messages use the literal numeric `protocolVersion: 1`. A backend process creates one
stream identifier in the form `WS_<UUID>` and keeps it for that process lifetime. Published event
sequences start at `1` and increase monotonically. Cursors may be `0`. Every event identifier is
exactly `<streamId>:<sequence>`.

A process restart creates a different stream and discards the in-memory replay buffer. The
protocol does not claim durable delivery.

## Server messages

| `messageType`     | Purpose                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| `SERVER_READY`    | Announces stream, current cursor, server time, and `SIMULATED` mode                  |
| `SYSTEM_SNAPSHOT` | Carries the runtime-validated canonical `SystemSnapshot`                             |
| `DOMAIN_EVENT`    | Carries a typed event envelope and payload                                           |
| `RESYNC_REQUIRED` | Explains why replay is unsafe: `STREAM_CHANGED`, `CURSOR_TOO_OLD`, or `CURSOR_AHEAD` |
| `PONG`            | Replies to a client `PING` with the same request id                                  |
| `ERROR`           | Returns a bounded safe application error without raw schema issues or internals      |

The domain-event variants are `SYSTEM_SNAPSHOT_UPDATED`, `NODE_UPDATED`, `LAMP_UPDATED`,
`SENSOR_UPDATED`, `ALERT_UPSERTED`, and `LOG_APPENDED`. Each variant has a dedicated shared Zod
payload schema; arbitrary JSON payloads are not accepted.

## Client messages

| `messageType`      | Required data                                                                          |
| ------------------ | -------------------------------------------------------------------------------------- |
| `REQUEST_SNAPSHOT` | `protocolVersion`; optional safe `requestId`                                           |
| `PING`             | `protocolVersion`, safe `requestId`                                                    |
| `RESUME`           | `protocolVersion`, `streamId`, non-negative `afterSequence`; optional safe `requestId` |

Messages are strict JSON objects. Binary frames are rejected. Unknown fields, unknown message
types, unsupported versions, malformed JSON, and invalid payloads count toward the connection's
invalid-message limit. The gateway returns a safe `ERROR` for each invalid message and closes the
connection with policy-violation code `1008` after the third invalid application message.

There is no server timer or periodic application heartbeat. A client that needs an application
liveness check sends `PING` and waits for `PONG`; the underlying `ws` transport may still perform
its own protocol-level control frames.

## Connection lifecycle

For an allowed handshake the gateway performs these actions in order:

1. Register the connection and subscribe it to the publisher.
2. Send `SERVER_READY` with the current stream and cursor.
3. Read the existing `GetSystemSnapshotService`, validate with `SystemSnapshotSchema`, and send
   `SYSTEM_SNAPSHOT` in `SIMULATED` mode.
4. Handle client messages and broadcast newly published events.
5. Unsubscribe and remove connection state on close or transport error.

Publisher subscriber exceptions and socket send failures are isolated, so one broken listener or
client cannot prevent delivery attempts to other subscribers.

## Replay and resynchronization

The publisher retains only the configured number of most recent defensive event copies.
`RESUME` behavior is:

- current stream and retained cursor: replay events whose sequence is greater than
  `afterSequence`, in ascending sequence order;
- different stream: send `RESYNC_REQUIRED` with `STREAM_CHANGED`, then a current snapshot;
- cursor older than retained history: send `CURSOR_TOO_OLD`, then a current snapshot;
- cursor greater than the current server cursor: send `CURSOR_AHEAD`, then a current snapshot.

Resuming exactly at the current cursor succeeds with an empty replay. Consumers should persist
both `streamId` and the last fully processed sequence, replace local state when resync is required,
and advance their cursor only after processing a validated event.

## Publishing inside the backend

Application modules depend on the `RealtimePublisherPort`, not the WebSocket gateway. They call
`publish()` with one of the shared typed event drafts. The publisher assigns stream identity,
sequence, event id, and injected-clock timestamp; stores a defensive replay copy; then notifies a
snapshot of current subscribers. Future MQTT ingestion can use this port without coupling the
ingestion module to WebSocket transport code.
