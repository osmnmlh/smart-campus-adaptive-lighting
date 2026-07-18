# Scenario controls

The `/scenarios` route is a frontend-only workspace for presenting deterministic mock behavior. It does not connect to devices or backend services and does not use HTTP, WebSocket, MQTT, browser persistence, timers, wall-clock time, or random values.

## Local scenarios

The catalog contains five fixed scenarios: Empty Campus, Left to Right, Right to Left, Center Presence, and Node Offline. Each definition is validated with `ScenarioDefinitionSchema` imported from the `@smart-campus/contracts` package root. The frontend catalog intentionally remains independent from backend source files while presenting the same fixed event timing and direction semantics.

Every catalog entry is explicitly marked as simulated. Once a scenario is selected, preview metrics are marked `SIMULATED` with `GOOD` quality. Before selection, the snapshot is unavailable and no metric quality is claimed. The preview does not invent electrical current, voltage, power, energy, cost, carbon, or sustainability values.

Each definition starts from five explicit lamp records. The directional scenarios move one active sensor at a time from IR1 to IR5 or from IR5 to IR1. Their declared effects set the active lamp, neighboring pre-light lamps, remaining standby lamps, direction, brightness, target brightness, and PWM duty cycle deterministically. Events sharing a timestamp are applied in their declared order, so the prior sensor is cleared before the next sensor becomes active. Center Presence activates the middle lamp with its two neighbors pre-lit and keeps direction at `NONE`. Node Offline turns its affected lamp off and creates one deduplicated alert.

## Lifecycle and clock

The controller exposes `IDLE`, `READY`, `RUNNING`, `PAUSED`, `COMPLETED`, and `ERROR` presentation states. The page begins in `IDLE` with no implicitly selected fixture. Selecting a valid fixture creates its starting snapshot in `READY`; Start moves it to `RUNNING`, Pause and Resume preserve the virtual time, Reset reconstructs a clean `READY` state, and reaching the fixed duration produces `COMPLETED`.

Time advances only after the user presses **Step +1s** or **Advance +5s** while the scenario is running. The 0.5x, 1x, 2x, and 5x values multiply that next manual virtual delta only. There is no autoplay or background timer. Events at or before the new virtual time are consumed in their declared order, and the presentation log retains at most ten entries.

The controller validates scenario identifiers, speed values, manual deltas, and lifecycle transitions at runtime. Unsupported input produces a deterministic recoverable error instead of a silent no-op or unchecked throw. The UI announces that error through a polite status region. A subsequent valid action clears it; Reset recovers a selected fatal state to `READY`, while choosing a valid scenario reconstructs a clean state.

## Architecture

- `scenario-fixtures.ts` owns the contract-validated presentation definitions.
- `scenario-controller.ts` owns pure lifecycle validation, recovery, event consumption, and virtual-clock transitions.
- `scenario-reducer.ts` exhaustively routes typed actions to the controller.
- `scenario-selectors.ts` derives progress, direction, control availability, upcoming events, and the read-only snapshot preview.
- Components under `components/scenarios` render accessible controls and status regions without network side effects.

## Verification

The scenario test suite covers fixture validation, every valid and invalid lifecycle transition, fatal-state recovery, runtime speed and delta validation, stable same-timestamp ordering, exact lamp progression in both directions, sensor identity, snapshot counts, formatting, accessible controls, dashboard interactions, and navigation. Static audits should continue to reject backend imports and runtime use of `fetch`, WebSocket, MQTT, local storage, `Date.now`, `Math.random`, `setInterval`, or `setTimeout` in the scenario implementation.
