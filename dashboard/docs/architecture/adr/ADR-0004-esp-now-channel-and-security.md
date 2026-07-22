# ADR-0004: ESP-NOW channel and security boundary

Status: Accepted
Date: 2026-07-22

## Context

ESP-NOW/Wi-Fi coexistence requires alignment and field demos require bounded trust.

## Decision

The AP, `GW_1`, and nodes use one configured channel (1–13); automatic changes are disabled or controlled. Field mode uses static PMK/LMK encryption, MAC allowlisting, and node-to-MAC mapping. Source stores uppercase MAC shapes and non-secret NVS references only. Unencrypted operation is `LAB` only.

## Consequences

Deployment manages channel and secrets outside source. Static keys are MVP-only.

## Alternatives considered

One hard-coded channel and default unencrypted field operation were rejected; 1, 6, or 11 are recommendations only.

## Deferred work

Key provisioning/rotation, certificates, enterprise identity, and full anti-replay.
