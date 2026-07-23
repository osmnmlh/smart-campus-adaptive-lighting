# Firmware integration provisioning

This directory contains reference templates and the manual bring-up checklist. It is
not a second firmware configuration system.

- Copy `gateway-local.example.hpp` to the ignored
  `firmware/gateway/include/gateway_secrets.hpp`.
- Copy `node-peers.example.hpp` to the ignored
  `firmware/node/include/node_secrets.hpp`.
- Replace every placeholder on the provisioning workstation.
- Keep all four ESP32 devices on Wi-Fi / ESP-NOW channel 6.

The gateway MQTT URI remains configurable. A controlled local lab may use
`mqtt://192.168.x.x:1883`. An Internet broker would normally use
`mqtts://mqtt.example.com:8883`, username/password authentication, least-privilege
ACLs, and verified TLS. The current firmware does not complete TLS certificate
verification, so an `mqtts` URI alone must not be presented as production-ready.
Anonymous or TLS-free brokers must never be exposed to the Internet.

Nodes never connect to the Internet or MQTT. They exchange ESP-NOW frames only with
`GW_1` and registered peer nodes. LAB_UNENCRYPTED profiles exist only for CI
compilation. FIELD profiles fail to compile until the ignored secrets header exists.

Manual upload commands are documented in
`dashboard/docs/integration/hardware-mvp-bring-up.md`. No script in this repository
automatically selects a COM port or flashes hardware.
