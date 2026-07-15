# Local Dashboard Infrastructure

This phase provides local PostgreSQL and Eclipse Mosquitto services with Docker Compose. It uses
the exact image tags `postgres:18.4` and `eclipse-mosquitto:2.0.22`. The frontend and backend are
not containerized, and the backend is not yet connected to PostgreSQL or MQTT.

Copy `infrastructure/.env.example` to `infrastructure/.env`, then replace the example PostgreSQL
password with a local development value. Never commit real secrets.

From the dashboard directory:

```sh
npm run infra:config
npm run infra:up
npm run infra:ps
npm run infra:logs
npm run infra:down
```

Published ports bind only to `127.0.0.1`. Mosquitto anonymous access is for local development
only and is unsafe for LAN or production use; authentication, ACLs and TLS must be added first.

Named volumes persist after `infra:down`. To deliberately remove local infrastructure data, run
the following manually after confirming the selected Compose project:

```sh
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml down -v --remove-orphans
```
