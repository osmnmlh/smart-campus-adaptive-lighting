# Alerts dashboard

`/alerts` presents a deterministic, read-only history of 15 simulated alert records. Every raw
record is validated with the shared `AlertSchema` before it reaches the presentation model. The
fixture spans a fixed 24-hour UTC window and uses stable IDs and sequence values so filtering,
sorting, tests, and demonstrations are repeatable.

The page includes dataset summaries, severity/status/entity/time-range filters, a newest-first
semantic table, and a detail panel. Equal timestamps use the fixture sequence as the stable
tie-breaker. Empty filter results, an empty fixture, and invalid fixture data have separate safe
states.

All displayed records are labeled `SIMULATED`. The page does not connect to an API, WebSocket,
MQTT, database, or production incident system. Acknowledge, resolve, delete, retry, persistence,
and device-control actions are intentionally unavailable.
