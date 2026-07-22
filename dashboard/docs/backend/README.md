# Dashboard Backend

`@smart-campus/backend` is the NestJS service used by the dashboard. It runs as strict ESM
TypeScript and imports shared domain types and runtime schemas only from the
`@smart-campus/contracts` package root.

The service currently exposes:

- `GET /health` for a minimal liveness and contract-version response;
- deterministic, read-only REST resources below `/api/v1`;
- a native WebSocket realtime endpoint at `/ws/v1`.

The WebSocket endpoint sends a `SERVER_READY` message followed by the canonical
`SYSTEM_SNAPSHOT` when an allowed client connects. It supports client `PING`,
`REQUEST_SNAPSHOT`, and `RESUME` messages and broadcasts typed `DOMAIN_EVENT` messages published
through the backend realtime publisher port. The current source is explicitly `SIMULATED`; no
live MQTT or database integration is implied. See
[`docs/architecture/websocket-realtime-protocol.md`](../architecture/websocket-realtime-protocol.md)
for the complete protocol and replay rules.

Backend environment values are not public configuration. Development examples live in
`backend/.env.example`. The HTTP server binds to `127.0.0.1:3001` by default. REST CORS and
WebSocket handshake origins are separate allowlists; the WebSocket allowlist defaults to the
exact origin `http://localhost:3000`. Wildcards and missing Origin headers are rejected.

`DASHBOARD_DEV_TOKEN` remains an unused placeholder for a future command-authorization phase.
PostgreSQL, MQTT ingestion, authentication, authorization, durable replay, alert writes, and
scenario-command endpoints are still outside the current backend scope.
