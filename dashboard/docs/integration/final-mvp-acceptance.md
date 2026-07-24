# Final MVP acceptance

## Accepted scope

The MVP software chain is:

```text
NODE_1 / NODE_2 / NODE_3 -> ESP-NOW -> GW_1 -> verified MQTTS
  -> backend ingestion -> WebSocket/REST read model -> dashboard
```

Nodes retain autonomous lighting control if the gateway, broker, or dashboard is
unavailable. The gateway is visibility-only: it publishes the existing canonical
status, heartbeat, event, lamp, and electrical telemetry topics and subscribes to no
command topic.

The completed chain includes bounded firmware codecs and queues, encrypted field
ESP-NOW peers, gateway QoS 1/PUBACK retry and retained status/LWT, authenticated
least-privilege MQTT ingestion, live backend normalization, same-origin HTTPS/WSS,
energy analytics with measured-versus-nominal provenance, and TR/EN dashboard
localization.

## Prerequisites and provisioning

- Provision one Linux server, Docker Compose v2, public DNS for `APP_DOMAIN` and
  `MQTT_DOMAIN`, and inbound `80`, `443`, and `8883`. Keep public `1883` closed.
- Create the ignored `.env.production` and interactive Mosquitto password file. The
  committed ACL grants only the existing gateway publish and backend read paths.
- Put gateway Wi-Fi/MQTT credentials, node MAC allowlists, PMK, and LMKs in the
  ignored firmware headers.
- Put the trusted MQTT issuer CA PEM in ignored `gateway_tls_ca.hpp`. Field builds
  require `mqtts://`, non-empty credentials, and a valid non-placeholder PEM.
- Map every board to its COM port manually. Verify the server and MQTTS endpoint,
  build/flash `GW_1`, then flash `NODE_1`, `NODE_2`, and `NODE_3`.

Detailed procedures remain in the
[single-server runbook](../deployment/single-server-online-mvp.md) and
[hardware bring-up guide](hardware-mvp-bring-up.md). No repository script performs
remote deployment, firewall changes, device discovery, or automatic flashing.

## Verification

From `dashboard/deployment`, run:

```sh
./scripts/validate-deployment.sh
./scripts/verify-online-mvp.sh
```

The online script is bounded and credential-safe. It verifies DNS, dashboard/backend
HTTP routes, HTTPS and MQTTS certificate/hostname validation, and closed public
plaintext MQTT. Because the production ACL has no disposable test topic, its optional
authenticated mode performs static authentication/ACL verification without widening
permissions or mutating canonical state.

For hardware acceptance, confirm retained gateway `ONLINE`, three node heartbeats,
expected sensor/lamp/electrical topics, backend LIVE mode, and live dashboard updates.
The canonical topic and observation list is in the hardware bring-up guide.

## Final checklist

- [ ] DNS, certificates, `.env.production`, password file, and ACL are provisioned.
- [ ] Public ports are exactly `80`, `443`, and `8883`; anonymous MQTT is disabled.
- [ ] Online verification reports `VERIFIED`.
- [ ] Gateway secrets, trusted CA, MACs, PMK, and LMKs are locally provisioned.
- [ ] Gateway field build and all four manual flashes use explicitly mapped ports.
- [ ] Gateway reports verified MQTTS connectivity and retained `ONLINE`.
- [ ] Three nodes, expected telemetry, backend LIVE mode, and TR/EN UI are verified.
- [ ] Energy values identify measured electrical data separately from nominal
      estimates.

## Known MVP limits

Energy accumulation is in-memory and session-scoped; restart resets session energy.
There is no PostgreSQL, migration layer, durable long-term history, device command,
OTA, mutual TLS, automatic remote deployment, or automatic hardware flash. CA
rotation requires a gateway rebuild and manual flash. Operational acceptance is not
claimed until the real server and physical hardware complete the checklist.
