# ADR-0001: Separate ESP32 gateway

Status: Accepted
Date: 2026-07-22

## Context

Lighting must continue locally without campus connectivity.

## Decision

Use a fourth ESP32, `GW_1`. `NODE_2` is not the gateway. Nodes remain autonomous; gateway failure interrupts MQTT/dashboard visibility, not local lighting.

## Consequences

Gateway and node concerns, identities, and failure domains are separated; one additional device is required.

## Alternatives considered

Using `NODE_2` as gateway was rejected because it couples central lighting to Wi-Fi/MQTT availability.

## Deferred work

Gateway firmware, recovery, provisioning, monitoring, and replacement procedures.
