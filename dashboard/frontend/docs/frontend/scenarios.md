# Scenario controls

The `/scenarios` route is a frontend-only workspace for presenting deterministic mock behavior. It does not connect to devices or backend services and does not use HTTP, WebSocket, MQTT, browser persistence, timers, wall-clock time, or random values.

## Local scenarios

The catalog contains five fixed scenarios: Empty Campus, Left to Right, Right to Left, Center Presence, and Node Offline. Each definition is validated with `ScenarioDefinitionSchema` imported from the `@smart-campus/contracts` package root. The frontend catalog intentionally remains independent from backend source files while presenting the same fixed event timing and direction semantics.

All preview metrics are marked `SIMULATED` with `GOOD` quality. The preview does not invent electrical current, voltage, power, energy, cost, carbon, or sustainability values.

## Lifecycle and clock

The controller exposes `IDLE`, `READY`, `RUNNING`, `PAUSED`, `COMPLETED`, and `ERROR` presentation states. A selected fixture starts in `READY`; Start moves it to `RUNNING`, Pause and Resume preserve the virtual time, Reset reconstructs a clean `READY` state, and reaching the fixed duration produces `COMPLETED`.

Time advances only after the user presses **Step +1s** or **Advance +5s** while the scenario is running. The 0.5x, 1x, 2x, and 5x values multiply that next manual virtual delta only. There is no autoplay or background timer. Events at or before the new virtual time are consumed in their declared order, and the presentation log retains at most ten entries.

## Architecture

- `scenario-fixtures.ts` owns the contract-validated presentation definitions.
- `scenario-reducer.ts` owns pure lifecycle, event consumption, and virtual-clock transitions.
- `scenario-selectors.ts` derives progress, direction, control availability, upcoming events, and the read-only snapshot preview.
- Components under `components/scenarios` render accessible controls and status regions without network side effects.

## Verification

The scenario test suite covers fixture validation, reducer transitions, speed behavior, selectors, formatting, accessible controls, dashboard interactions, and navigation. Static audits should continue to reject backend imports and runtime use of `fetch`, WebSocket, MQTT, local storage, `Date.now`, `Math.random`, `setInterval`, or `setTimeout` in the scenario implementation.
