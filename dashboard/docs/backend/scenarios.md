# Deterministic mock scenario engine

The backend scenario engine produces reproducible Smart Campus snapshots for tests and future
adapters. It is pure TypeScript domain code driven by scenario-relative integer milliseconds. An
explicit fixed UTC epoch (normally `2026-01-01T00:00:00.000Z` in fixtures) converts virtual time
to contract timestamps; the system clock and real timers are never used.

Fixtures cover an empty campus, left-to-right movement, right-to-left movement, center presence,
and a node-offline alert. The mock direction window is 3 seconds: IR1 then IR2 means
`LEFT_TO_RIGHT`, IR5 then IR4 means `RIGHT_TO_LEFT`, and IR3 alone never establishes direction.

Brightness policy levels are OFF 0%, STANDBY 30%, PRE_LIGHT 60%, and ACTIVE 100%. Presence end
uses a 30-second hold followed by a 10-second virtual-time fade. These values are configurable
MVP/mock defaults, not field standards or production physical-control rules.

The engine imports schemas and shared domain types only from `@smart-campus/contracts`. Every
transport snapshot is runtime-validated with `SystemSnapshotSchema`, and simulated metrics use
`DataSource.SIMULATED`. Equal definitions, epochs, and advance sequences produce semantically and
JSON-byte-equivalent snapshots.

This phase contains no MQTT, API, WebSocket, persistence, scheduler, background timer, or real
ESP32 integration.
