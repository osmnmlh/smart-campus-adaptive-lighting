# Logs dashboard

`/logs` presents a deterministic, read-only history of 42 simulated operational log records.
Every raw record is validated with the shared `EventLogSchema` before it reaches the presentation
model. The fixture spans the same fixed 24-hour UTC window as Alerts and uses stable IDs and
sequence values.

The page includes dataset summaries, category/level/entity/time-range filters, a newest-first
semantic table, and a detail panel. The presentation categories are `SYSTEM`, `SCENARIO`,
`SENSOR`, `DIRECTION`, `LAMP`, `NODE`, and `ALERT`; levels are `INFO`, `WARNING`, and `ERROR`.
Empty filter results, an empty fixture, and invalid fixture data have separate safe states.

All displayed records are labeled `SIMULATED`. There is no live stream, API, WebSocket, MQTT,
database, production log ingestion, automatic refresh, export, replay, deletion, or persistence.
