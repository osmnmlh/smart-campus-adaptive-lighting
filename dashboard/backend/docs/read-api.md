# Deterministic read API

This phase adds a versioned, read-only NestJS API at `/api/v1`. The existing `GET /health`
response remains unchanged and is not wrapped in the API envelope.

## Endpoints

- `GET /api/v1/system/snapshot`
- `GET /api/v1/alerts`
- `GET /api/v1/alerts/:alertId`
- `GET /api/v1/logs`
- `GET /api/v1/logs/:logId`
- `GET /api/v1/scenarios`
- `GET /api/v1/scenarios/:scenarioId`

Alert list queries support `severity`, `status`, `entityId`, `timeRange`, `offset`, and
`limit`. Log list queries support `category`, `level`, `entityId`, `timeRange`, `offset`, and
`limit`. Values are case-sensitive canonical contract/read-model values. `timeRange` accepts
`15m`, `60m`, `24h`, or `all`. Offset defaults to `0`; limit defaults to `25` and must be an
integer from `1` through `100`. Invalid, duplicate, empty, whitespace-padded, decimal, negative,
or unknown values return HTTP 400 instead of being silently clamped.

Successful responses use `{ "data": ..., "meta": ... }`. Metadata identifies the fixed
`2026-06-15T20:30:00.000Z` as-of timestamp, `SIMULATED` provenance, and
`deterministic: true`. List metadata also reports `total`, `filteredCount`, `offset`, `limit`,
`returnedCount`, and `hasMore`. Filtering uses the fixed as-of value, sorting is stable and
newest-first, and pagination is applied after sorting.

Errors use `{ "error": { "code", "message", "details"? } }`. Supported API error codes are
`INVALID_QUERY`, `INVALID_IDENTIFIER`, `NOT_FOUND`, `READ_MODEL_INVALID`, and
`INTERNAL_ERROR`. Responses do not expose stack traces, filesystem paths, raw schema issues, or
internal class names.

The snapshot is produced from the existing deterministic scenario engine. Scenario catalog
records are derived from its five canonical fixtures. Alert and log records are held in a
backend-local deterministic fixture and runtime-validated with package-root imports from
`@smart-campus/contracts`. The temporary dataset matches the frontend presentation baseline:
15 alerts (5 active, 10 resolved; 1 critical, 9 warning, 5 info) and 42 logs with the same
category and level totals. The duplicated fixture is transitional and will be removed when the
frontend live-data adapter is introduced.

Repository ports isolate application services from defensive-copy in-memory implementations so
PostgreSQL-backed implementations can replace them later. Controllers perform only HTTP mapping
and runtime input parsing; application services own filtering, stable sorting, pagination, and
response metadata.

This is an open development read API, not a production-ready service. The frontend does not yet
call it. A companion native WebSocket endpoint at `/ws/v1` reuses the same canonical snapshot;
its protocol is documented in `docs/architecture/websocket-realtime-protocol.md`. PostgreSQL,
MQTT ingestion, persistence, authentication, authorization, alert acknowledgement/resolution,
and every write or scenario-command endpoint remain intentionally absent. Process restarts
provide no persistence guarantee, and all records are simulated rather than live telemetry,
production incidents, or production audit history.
