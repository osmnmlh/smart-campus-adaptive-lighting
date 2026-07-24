# Metrics dashboard

`/metrics` presents lamp, ambient-light, sensor, and MVP energy analytics from the active dashboard
data mode. Simulated mode remains deterministic and performs no network requests. Live mode obtains
the initial energy summary from `GET /api/v1/energy/summary` and applies typed
`ENERGY_ANALYTICS_UPDATED` WebSocket events through the shared dashboard provider.

The lamp charts retain fixed 5, 15, and 60 minute windows, an accessible semantic table alternative,
and explicit source and quality labels. The energy section adds:

- current actual, full-brightness reference, and saved power;
- process-session actual, reference, and saved energy;
- savings percentage and direct-measurement coverage;
- an L1-L5 power and provenance breakdown.

Only L3 may use a fresh, good INA219 power sample and display `MEASURED`. L1, L2, L4, and L5 are
brightness-based `ESTIMATED` values; L3 also falls back to `ESTIMATED` when its sample is missing or
stale. System totals and savings are `CALCULATED`. Simulated mode labels every lamp `SIMULATED` and
does not imply live hardware coverage.

Energy accumulators are process-session only and reset when the backend restarts. The dashboard does
not claim persistent history, billing-grade accuracy, cost savings, or carbon reduction. The
calculation rules and configuration are documented in
[`mvp-energy-analytics.md`](../architecture/mvp-energy-analytics.md).
