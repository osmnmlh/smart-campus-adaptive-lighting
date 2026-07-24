# Single-server production deployment

This directory is the production-only Docker Compose surface for one Linux server. It does not
replace or modify `dashboard/infrastructure`, which remains the local development stack.

Public traffic enters only through Traefik:

- `https://APP_DOMAIN/` routes to the frontend.
- `https://APP_DOMAIN/api/v1`, `/health`, and `/ws/v1` route to the backend.
- `mqtts://MQTT_DOMAIN:8883` terminates TLS at Traefik and forwards MQTT to Mosquitto on the
  private container port `1883`.

The backend, frontend, and Mosquitto publish no host ports. PostgreSQL is intentionally absent.

## Files

- `compose.production.yaml`: four-service production stack.
- `frontend.Dockerfile` and `backend.Dockerfile`: pinned multi-stage application images.
- `mosquitto/`: production authentication, persistence, and least-privilege ACL configuration.
- `.env.production.example`: non-secret configuration template.
- `scripts/initialize-mqtt-users.sh`: interactive password-file creation without password command
  arguments or output.
- `scripts/validate-deployment.sh`: fourteen deployment contract checks.
- `scripts/deploy.sh`: validate, build, start, and bounded public health check.

Copy `.env.production.example` to the ignored `.env.production`, replace every example value, and
follow [the deployment runbook](../docs/deployment/single-server-online-mvp.md).

AUDIT REUSED FROM UNCHANGED DEPENDENCY BASELINE
