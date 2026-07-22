# ADR-0002: Message identity and bounded delivery

Status: Accepted
Date: 2026-07-22

## Context

Node restarts, ESP-NOW loss, and MQTT QoS 1 duplicates require unambiguous origin identity.

## Decision

Each node uses per-boot sequence from 1 and NVS-backed `bootId`. Deduplication is `nodeId:bootId:sequence`. `gatewaySequence` records acceptance order and `gatewayBootId` diagnoses restart; neither changes node identity. MQTT uses QoS 1 with backend deduplication. Non-blocking ESP-NOW retry is bounded: heartbeat/electrical 1, sensor/lamp 2.

## Consequences

Restarts differ from sequence regression and duplicates are safe. Callback success is not claimed as delivery.

## Alternatives considered

Global sequence, QoS 2, infinite retry, and application ACK were rejected.

## Deferred work

NVS counters, retry queues, deduplication persistence, packet-gap metrics, and anti-replay hardening.
