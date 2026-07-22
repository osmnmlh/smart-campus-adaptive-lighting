# ADR-0005: Energy measurement provenance

Status: Accepted
Date: 2026-07-22

## Context

One INA219 cannot directly measure every lamp or node.

## Decision

Place `INA219_1` on `NODE_2`/`L3`. Only this transport publishes `MEASURED` voltage, current, power, and cumulative `energyWh`; the counter may reset with `bootId`. `L1/L2/L4/L5` are future `ESTIMATED` values; totals and savings are `CALCULATED`.

## Consequences

Coverage is 1/3 nodes and 1/5 lamps. Never claim the whole system is measured.

## Alternatives considered

A two-lamp node cannot provide lamp-level measured attribution; fabricated measured values were rejected.

## Deferred work

Estimation, persistent accumulation, calibration, and more meters.
