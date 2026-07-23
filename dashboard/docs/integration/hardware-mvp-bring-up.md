# Hardware MVP bring-up

## Chain and required equipment

The verified path is:

```text
NODE_1 / NODE_2 / NODE_3 -> ESP-NOW -> GW_1 -> MQTT
  -> backend ingestion -> read model -> /ws/v1 and REST snapshot
```

Bring four supported ESP32 boards, the IR inputs and PWM driver/lamps listed in
`firmware/integration/hardware-checklist.md`, a BH1750 and INA219 for `NODE_2`, a
regulated supply, USB data cables, and a 2.4 GHz access point. All devices must use
the same fixed Wi-Fi / ESP-NOW channel 6.

## Provisioning

Use `firmware/integration/gateway-local.example.hpp` and
`node-peers.example.hpp` only as reference templates. Put real values in the ignored
canonical headers:

```text
firmware/gateway/include/gateway_secrets.hpp
firmware/node/include/node_secrets.hpp
```

Never commit MACs, Wi-Fi credentials, MQTT credentials, PMKs, or LMKs. `GW_1` owns
Wi-Fi, UTC, and MQTT. Nodes have no Internet or MQTT connection and communicate only
over ESP-NOW with registered peers.

A controlled local LAN may use `mqtt://192.168.x.x:1883`. The URI remains
configurable. An online service normally uses `mqtts://mqtt.example.com:8883` plus
username/password, least-privilege ACLs, and verified TLS. Anonymous or TLS-free
Internet listeners are prohibited. Current gateway firmware does not complete TLS
certificate verification; do not treat an `mqtts` URI alone as production-ready.

## Manual flash order

Map every physical board to a COM port yourself. Never infer a port from enumeration.
Flash the gateway first, then the three nodes. These commands are examples only and
are not run by the integration smoke:

```powershell
.\.venv-firmware\Scripts\pio.exe run -d firmware/gateway -e esp32dev-field -t upload --upload-port COM_X
.\.venv-firmware\Scripts\pio.exe run -d firmware/node -e node1-field -t upload --upload-port COM_X
.\.venv-firmware\Scripts\pio.exe run -d firmware/node -e node2-field -t upload --upload-port COM_X
.\.venv-firmware\Scripts\pio.exe run -d firmware/node -e node3-field -t upload --upload-port COM_X
```

After each manual upload, use 115200 baud only on the explicitly mapped port. Confirm
the gateway joins 2.4 GHz Wi-Fi on channel 6 before powering the nodes.

## Local broker, backend, and smoke

From `dashboard`, start only the existing Mosquitto service:

```powershell
docker compose --env-file infrastructure/.env.example -f infrastructure/compose.yaml up -d --wait mosquitto
npm.cmd run build --workspace=@smart-campus/backend
$env:MQTT_ENABLED='true'
$env:MQTT_BROKER_URL='mqtt://127.0.0.1:1883'
$env:WEBSOCKET_ALLOWED_ORIGINS='http://localhost:3000'
npm.cmd run start:prod --workspace=@smart-campus/backend
```

In another terminal:

```powershell
$env:INTEGRATION_BACKEND_HTTP_URL='http://127.0.0.1:3001'
$env:INTEGRATION_BACKEND_WS_URL='ws://127.0.0.1:3001/ws/v1'
$env:INTEGRATION_WS_ORIGIN='http://localhost:3000'
$env:INTEGRATION_MQTT_URL='mqtt://127.0.0.1:1883'
$env:INTEGRATION_MQTT_USERNAME=''
$env:INTEGRATION_MQTT_PASSWORD=''
npm.cmd run smoke:mvp-integration
```

Stop the backend you started, then stop/remove only the Mosquitto service you started.
Do not stop unrelated containers:

```powershell
docker compose --env-file infrastructure/.env.example -f infrastructure/compose.yaml stop mosquitto
docker compose --env-file infrastructure/.env.example -f infrastructure/compose.yaml rm -f mosquitto
```

## Expected observations

The smoke uses only canonical files in `firmware/test-vectors`. Expected topics are:

```text
smart-campus/v1/gateways/GW_1/status
smart-campus/v1/nodes/NODE_1/heartbeat
smart-campus/v1/nodes/NODE_2/heartbeat
smart-campus/v1/nodes/NODE_3/heartbeat
smart-campus/v1/nodes/NODE_1/events
smart-campus/v1/nodes/NODE_2/events
smart-campus/v1/nodes/NODE_2/telemetry
```

`/ws/v1` must first send `SERVER_READY` and `SYSTEM_SNAPSHOT`, then normalized node,
sensor, lamp, measured-electrical, and `LIVE` connection events. REST
`/api/v1/system/snapshot` must show three online nodes, active IR1, L3 at 30%, and the
measured L3 electrical values. Repeating the sensor `messageId` must not emit another
sensor event. An invalid MQTT payload must not stop `/health`.

For an offline check, stop one mapped node and wait longer than the 15-second
liveness timeout; expect one offline node update and a non-LIVE connection mode.
Restore power and confirm the next valid node message recovers it once.

## Troubleshooting order and honest statuses

Check in this order: regulated power/common GND, board-to-COM mapping, channel 6,
provisioned MAC allowlists and PMK/LMKs, gateway Wi-Fi, broker host/port and
credentials, retained gateway status, node heartbeats, backend MQTT logs, WebSocket,
then REST. Do not change contracts to work around wiring or provisioning errors.

Use only these hardware result labels:

- `PASSED`
- `FAILED`
- `NOT_RUN_NO_DEVICE`
- `NOT_RUN_DEVICE_MAPPING_REQUIRED`
- `NOT_RUN_MISSING_FIELD_CONFIG`
- `NOT_RUN_DOCKER_UNAVAILABLE`

No device discovery command, smoke script, or CI job performs automatic flashing.
