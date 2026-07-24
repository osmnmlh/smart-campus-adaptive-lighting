# Frontend live data adapter

The dashboard has two explicit public data modes. `simulated` is the default and keeps the existing
deterministic fixtures, selectors, scenario controls, and tests. It does not call `fetch`, create a
`WebSocket`, or retry a network connection. `live` reads from the backend and never falls back to
mock data when configuration, REST loading, contract validation, or realtime transport fails.

## Public configuration

```dotenv
NEXT_PUBLIC_DASHBOARD_DATA_MODE=simulated
NEXT_PUBLIC_BACKEND_HTTP_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:3001/ws/v1
```

`NEXT_PUBLIC_DASHBOARD_DATA_MODE` accepts only `simulated` or `live`. A missing value selects
`simulated`; another value produces a visible safe configuration error. In live mode, blank backend
URLs enable same-origin operation:

- HTTP uses `window.location.origin`.
- WebSocket uses `/ws/v1` on the same origin, mapping HTTP to `ws` and HTTPS to `wss`.

Explicit public URLs must use HTTP(S) and WS(S), respectively, and cannot contain credentials.
These variables are compiled into the browser bundle and must never contain secrets.

## Initial REST load

Live mode performs read-only GET requests for:

- `/api/v1/system/snapshot`
- `/api/v1/alerts?timeRange=all&limit=100`
- `/api/v1/logs?timeRange=all&limit=100`

Each request requires a successful HTTP status and valid JSON response envelope. Payloads are
validated with `SystemSnapshotSchema`, `AlertSchema`, and `EventLogSchema` imported from the
`@smart-campus/contracts` package root. Requests share an eight-second timeout and are aborted when
the provider unmounts. The WebSocket is opened only after all three initial reads succeed.

## Realtime behavior

The adapter uses the browser's native `WebSocket` and validates every text frame with
`RealtimeServerMessageV1Schema`.

- `SERVER_READY` records the stream, cursor, backend data mode, and connected transport state.
- `SYSTEM_SNAPSHOT` replaces the current snapshot.
- `DOMAIN_EVENT` accepts only the active stream and a sequence greater than the current cursor.
- Node, lamp, sensor, alert, log, snapshot, and backend connection variants are reduced
  immutably.
- Duplicate and stale sequences, other streams, binary frames, malformed JSON, and
  contract-invalid frames are ignored.
- `RESYNC_REQUIRED` is surfaced safely; the server's following snapshot is accepted.
- `PONG` does not mutate domain state. A server `ERROR` displays its safe message without forcing
  the socket closed.

Reconnect delays are 1s, 2s, 5s, and then 10s (capped at 10s). Only one socket and one reconnect
timer can exist. Backoff resets after a valid `SERVER_READY`. Offline clients do not retry
aggressively; the browser `online` event makes one eligible attempt. Unmount aborts REST, removes
the online listener, cancels the timer, and closes only the adapter's socket.

Transport state (`SIMULATED`, `CONNECTING`, `CONNECTED`, `RECONNECTING`, `DISCONNECTED`, `ERROR`) is
kept separate from backend data mode (`SIMULATED`, `DISCONNECTED`, `DEGRADED`, `LIVE`). Both are
shown textually in the application header.

## Page integration

Overview, Topology, Metrics, Alerts, and Logs read through the shared provider. Existing adapters
still shape the presentation models. Live alerts and logs accept shared-contract records without
requiring fixture-only presentation metadata.

Metrics in live mode contain only samples observed during the current browser session. History is
bounded to 120 snapshots and is not persisted. A single initial snapshot therefore produces one
point, not invented history. Logs are deduplicated and bounded to 500 records.

Scenarios remain an explicit `SIMULATED` local workspace. Their controls do not send REST,
WebSocket, MQTT, or device commands.

## Single-server deployment

For a reverse-proxied deployment, leave both backend URLs blank and route `/api/v1/*` plus
`/ws/v1` to the backend on the same public origin. Set
`NEXT_PUBLIC_DASHBOARD_DATA_MODE=live` before the frontend production build. The backend must allow
the exact frontend origin for CORS and WebSocket upgrade checks.
