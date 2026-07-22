# Sharp Upstream Risk Acceptance

## Status

Temporarily Accepted

## Context

- The stable Next.js line uses sharp 0.34.x as an optional dependency.
- npm audit reports that version line as high severity.
- Patched sharp 0.35.x releases exist, but stable Next.js does not yet accept them.
- A canary framework release was rejected.
- An override outside the parent semver range was rejected.

## Exposure assessment

- The dashboard has no user image upload feature.
- It does not process user-controlled remote image URLs.
- Built-in Next.js image optimization is disabled with `images.unoptimized: true`.
- This acceptance is not a general security approval for all sharp usage.

## Mitigations

- The dashboard uses the latest stable Next.js 16.2.x patch.
- Built-in image optimization is disabled.
- fast-uri is separately pinned to its safe transitive version.
- The residual high finding is accepted only for the exact Next.js to sharp chain.

## Exit condition

Remove this acceptance when any of the following occurs:

- Stable Next.js adopts patched sharp 0.35.x.
- Stable Next.js removes the vulnerable sharp dependency.
- The project adds image upload or optimization requirements.
- The advisory scope or exploitability assessment changes.

## Restrictions

- No canary Next.js.
- No unsupported sharp override.
- No untrusted image processing.
- No production-ready security claim.

## Review date

Review during the next dependency update phase or stable Next.js security release.
