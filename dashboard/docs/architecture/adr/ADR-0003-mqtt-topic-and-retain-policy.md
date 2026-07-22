# ADR-0003: MQTT topic, QoS, and retain policy

Status: Accepted
Date: 2026-07-22

## Context

Topics must be versioned without stale online state.

## Decision

Use `smart-campus/v1/nodes/{nodeId}/{heartbeat|events|telemetry|status}` and `smart-campus/v1/gateways/GW_1/status`. QoS is 1. Only gateway birth/status and OFFLINE Last Will are retained; node messages are not. Node state derives from timeout. No command topic exists.

## Consequences

Subscriptions are stable and gateway LWT is visible without stale node ONLINE records.

## Alternatives considered

QoS 2 and retained node ONLINE/heartbeat were rejected.

## Deferred work

Broker ACLs, actual subscriptions, reconnect behavior, and observability.
