# Single-server online MVP runbook

This runbook deploys the dashboard, API/WebSocket backend, and authenticated MQTT ingestion to one
Linux server. It is an MVP topology, not a high-availability design.

## Prerequisites

1. Provision a supported Linux server with Docker Engine and the Compose v2 plugin.
2. Create DNS `A` records for the dashboard and MQTT hostnames pointing to the server. Add `AAAA`
   records only when IPv6 is configured and reachable.
3. Allow inbound TCP `22` from trusted administration addresses and public TCP `80`, `443`, and
   `8883`. Do not expose `1883`, backend `3001`, frontend `3000`, or a Traefik dashboard port.
4. Confirm no other process binds ports `80`, `443`, or `8883`.
5. Clone the repository and check out the intended immutable release commit.

Example UFW policy:

```sh
sudo ufw default deny incoming
sudo ufw allow from YOUR_ADMIN_CIDR to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8883/tcp
sudo ufw enable
```

## Configure secrets and domains

From `dashboard/deployment`:

```sh
cp .env.production.example .env.production
chmod 600 .env.production
```

Replace the example domains, ACME email, and both `CHANGE_ME` passwords. Keep
`NEXT_PUBLIC_DASHBOARD_DATA_MODE=live` and both backend URL variables blank: the browser derives
HTTPS and WSS from its same origin.

The committed ACL expects usernames `gateway_gw1` and `backend_ingest`. If usernames change, update
the matching `user` declarations in `mosquitto/acl` in the same reviewed release.

Generate Mosquitto hashes interactively:

```sh
./scripts/initialize-mqtt-users.sh
```

The two prompts do not echo passwords and the passwords are not command arguments. Enter the same
gateway and backend plaintext values stored in `.env.production`. The generated
`secrets/mosquitto/passwords` file and `.env.production` are ignored by Git. Never commit, paste
into logs, or transmit either file.

## Validate and deploy

```sh
./scripts/validate-deployment.sh
./scripts/deploy.sh
```

The deployment script renders the Compose model, builds pinned frontend/backend images, waits for
container health, and checks `https://APP_DOMAIN/health` for at most 90 seconds. First certificate
issuance requires working DNS and public port `80`; Traefik persists ACME state in the
`traefik_acme` named volume.

Run the bounded, read-only external verification from `dashboard/deployment`:

```sh
./scripts/verify-online-mvp.sh
```

It reads `.env.production`, applies per-step timeouts, checks DNS, `/health`, `/`, `/metrics`,
HTTPS and MQTTS certificate/hostname verification, and confirms public port `1883` is closed. It
never prints credentials. `RUN_AUTHENTICATED_MQTT_SMOKE=1` performs safe static authentication
and ACL checks only: the production ACL intentionally has no disposable test topic and is not
widened for a smoke test.

Configure the gateway with an `mqtts://MQTT_DOMAIN:8883` URI, the gateway username/password, and
the trusted issuer CA in the ignored `gateway_tls_ca.hpp`. Field firmware rejects plaintext,
missing credentials, and missing or placeholder CA material before creating the MQTT client.
Certificate-chain and hostname verification are mandatory. CA rotation requires a field rebuild
and manual gateway flash. The backend uses only the private `mqtt://mosquitto:1883` hop.

## Operations

Run from `dashboard/deployment`:

```sh
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml logs --tail=200 traefik
docker compose --env-file .env.production -f compose.production.yaml logs --tail=200 backend
docker compose --env-file .env.production -f compose.production.yaml logs --tail=200 mosquitto
```

All services restart unless stopped and use Docker JSON log rotation (`10m`, three files). Traefik
access logs provide public routing visibility. Application and broker logs must not contain
credentials.

Back up these assets before upgrades:

- the ignored `.env.production` and `secrets/mosquitto/passwords` files through a secret-safe
  backup channel;
- the `smart-campus_traefik_acme` volume;
- the `smart-campus_mosquitto_data` volume.

Test restore procedures away from production. Protect backup copies at least as strongly as the
server.

## Upgrade and rollback

Set a unique immutable `IMAGE_TAG` (for example the release commit SHA), then run `deploy.sh`.
Record the previous release commit, image tag, environment file, and volume backup.

To roll back application containers, check out the previous release, restore its matching
configuration, set the previous `IMAGE_TAG`, and run:

```sh
docker compose --env-file .env.production -f compose.production.yaml up -d --no-build --wait
```

If a schema-free application rollback is insufficient, stop the stack and restore the Mosquitto
data or ACME backup only when the incident requires it. This MVP has no production database.

## Recovery notes

- Certificate failure: verify DNS, public port `80`, ACME email, and Traefik logs. Do not delete
  `acme.json` as a first response.
- Dashboard unavailable: inspect Traefik routing and frontend/backend health; `/health` must route
  to the backend with higher priority than the frontend.
- MQTT unavailable: verify `8883` reachability and SNI, then inspect Traefik and Mosquitto logs.
  Never open public plaintext `1883` as a workaround.
- Authentication failure: regenerate the password file deliberately, update matching ignored
  plaintext values, and restart backend and Mosquitto. Existing gateway credentials must be
  rotated in coordination.

AUDIT REUSED FROM UNCHANGED DEPENDENCY BASELINE
