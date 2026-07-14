# Dashboard Repository Rules

- Canonical application directories are `frontend/`, `backend/`, and `packages/`; do not
  introduce an `apps/*` structure.
- Use npm workspaces and keep exactly one lockfile at `dashboard/package-lock.json`.
- On Windows PowerShell, use `npm.cmd` and `npx.cmd` when script execution policy blocks the
  PowerShell wrappers.
- Do not implement directly on `main`. Keep every branch focused on one feature or bounded
  infrastructure change.
- Do not push or merge without explicit user approval.
- Never commit secrets, real credentials, private keys, certificates, database dumps, MQTT
  password files, or local environment files.
- Keep measured, nominal, calculated, estimated, and simulated data explicitly distinguishable.
- Shared domain contracts will live in `packages/contracts`; do not duplicate those contracts in
  `frontend/` or `backend/`.
- Use `STALE` for the metric-quality enum value; never use `STale`.
- Represent brightness as `brightnessPercent` from 0 to 100 and MVP PWM duty as
  `pwmDutyPercent` from 0 to 100. Add `pwmDutyRaw` and `pwmResolutionBits` later only if raw PWM
  telemetry is required.
- Day/night threshold, node offline timeout, and fail-safe brightness are configurable MVP/mock
  defaults, not field standards or guarantees.
- `.vscode/` is ignored by default. Share selected workspace settings only through a separately
  reviewed repository-policy change.
