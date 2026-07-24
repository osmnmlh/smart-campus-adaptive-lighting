# MVP energy analytics and savings

## Purpose

The MVP exposes transparent current-power and process-session energy analytics without claiming
historical accuracy. It keeps measured, estimated, nominal, calculated, and simulated provenance
explicit.

## Measurement scope

Only `INA219_1` on `NODE_2` directly measures lamp `L3`. A valid measurement is attributed only to
L3 and is never generalized across the five-lamp system. L1, L2, L4, and L5 use the brightness
estimate:

```text
estimatedPowerW = nominalLampPowerW × brightnessPercent / 100
```

`ENERGY_NOMINAL_LAMP_POWER_W` defaults to `10` W for the MVP and is deployment-configurable. It is
not a calibrated field rating.

L3 uses its normalized INA219 `powerW` value when the measurement is `MEASURED`, `GOOD`, and no
older than `ENERGY_MEASUREMENT_STALE_MS` (default `15000`). Missing, invalid, or stale L3 power
falls back to the same brightness estimate and is marked `ESTIMATED`. The INA219 cumulative
`energyWh` remains a device counter that may reset with `bootId`; it is not used as the system
session accumulator.

## Current power and savings

Current actual power is the sum of the five lamp values. The full-brightness reference is:

```text
referencePowerW = nominalLampPowerW × 5
savedPowerW = max(0, referencePowerW - actualPowerW)
savingsPercent = savedPowerW / referencePowerW × 100
```

A measured L3 value above nominal is retained. Saved power and savings percent become zero rather
than clamping the measurement.

## Session-only energy

The backend integrates the previous current power as a simple step function. The accumulator starts
with the backend process and resets on every restart. It is not written to a database and has no
reset endpoint.

`ENERGY_MAX_INTEGRATION_GAP_MS` defaults to `30000`. When calculations are farther apart, only that
maximum interval is integrated. The summary sets quality to `STALE` and limitation code
`INTEGRATION_GAP_CAPPED`; missing time is not invented.

## Provenance and coverage

- Fresh L3 INA219 power: `MEASURED`.
- Missing or stale L3 power: `ESTIMATED`.
- L1, L2, L4, and L5: `ESTIMATED`.
- Current total and savings: `CALCULATED`.
- Full-brightness reference: `NOMINAL`.
- Simulated lamp inputs: `SIMULATED`; simulated totals remain `CALCULATED`.

Fresh L3 provides `1/5`, or 20%, lamp-level measurement coverage. Missing/stale L3 and simulated
mode report `0/5`, or 0%.

## Interfaces

`GET /api/v1/energy/summary` returns the shared `EnergyAnalyticsSummary` inside the existing API
envelope. Accepted `LAMP_STATE` and `ELECTRICAL_MEASUREMENT` mutations may publish the additive
`ENERGY_ANALYTICS_UPDATED` event through the existing native WebSocket publisher and replay stream.
Initial frontend state is loaded over REST; no second WebSocket connection exists.

Production provides:

- `ENERGY_NOMINAL_LAMP_POWER_W`
- `ENERGY_MEASUREMENT_STALE_MS`
- `ENERGY_MAX_INTEGRATION_GAP_MS`

## Deferred work

Persistent history, daily/monthly reporting, electricity cost, carbon calculations, calibration,
and additional physical meters are intentionally deferred. The Metrics UI shows no fabricated
history, cost, or CO2 result.

AUDIT REUSED FROM UNCHANGED DEPENDENCY BASELINE
