# Scenario Stage

The Scenario Stage is the primary physical presentation on `/scenarios`. It renders the existing deterministic `ScenarioControllerState` as a responsive SVG campus road. It is a frontend-only, `SIMULATED` view and is not connected to hardware, backend endpoints, WebSocket, MQTT, or a real clock.

## Presentation selector

`scenario-stage-model.ts` is a pure presentation selector. It consumes the controller's definition, lifecycle, direction, lamp records, active sensor identifiers, and offline node identifiers. It does not mutate state or change scenario-engine behavior. The same input produces the same view-model.

The physical lamp order is always L1, L2, L3, L4, L5. Communication ownership is:

- `NODE_1`: L1 and L2
- `NODE_2`: L3
- `NODE_3`: L4 and L5

Motion sensors map one-to-one: IR1 to L1, IR2 to L2, IR3 to L3, IR4 to L4, and IR5 to L5. BH1750 is rendered separately as an ambient light sensor. It never supplies a motion position or contributes to direction.

## Conservative motion and direction

One active IR sensor yields its matching lamp position. With multiple active IR sensors, the selector uses a position only when exactly one of those sensors matches an `ACTIVE` lamp. Otherwise the marker is hidden and the visible/accessibility summary says that the motion position is unavailable. IR3 center presence can therefore show a fixed L3 marker while direction remains `NONE`.

`LEFT_TO_RIGHT` displays a right arrow and text; `RIGHT_TO_LEFT` displays a left arrow and text. `NONE` and `UNKNOWN` display text without an arrow. Direction alone never creates a motion position.

The neutral marker represents only motion activity. The stage does not infer or display a vehicle, pedestrian, cyclist, person, bicycle, or other subject classification.

## Lamp, sensor, and node presentation

Every lamp carries its operating state, health, brightness, target brightness, and PWM duty value in the view-model. The SVG exposes a visible operating-state and brightness label. Halo radius and opacity derive only from `brightnessPercent`; `OFF`, unhealthy, `PRE_LIGHT`, and warning remain distinct concepts.

Active IR sensors use a restrained CSS pulse and visible `ACTIVE` text. The pulse is disabled under `prefers-reduced-motion: reduce`. Motion position changes use a 400 ms CSS transform transition, also disabled for reduced motion. There is no timer, autoplay, or infinite marker movement.

Offline node communication groups use muted dashed boundaries, an `Offline` text label, and a `WifiOff` status icon outside the SVG. Their lamp records continue to render from controller state; an offline node does not automatically force a lamp off.

## Responsive and accessible behavior

The SVG uses a stable `viewBox`. Desktop and tablet layouts scale within the stage card. At narrow widths, a contained stage wrapper provides horizontal scrolling so the page and navigation do not acquire page-level overflow and the L1–L5 order stays readable.

The stage is a named `figure` with a visible heading and caption. Its SVG has a title and a state-specific description. Direction, offline state, sensor state, brightness, source, and ambiguity are all available as text, not color alone. Decorative Lucide icons and SVG shapes are non-focusable.
