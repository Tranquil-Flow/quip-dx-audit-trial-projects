# DEVLOG — Quip Network QVRF Raffle Service

## Research Sources (in order)

1. https://developers.quip.network/docs/compute/qvrf — QVRF concept docs
2. https://quip.network/qvrf/ — QVRF product page
3. https://github.com/QuipNetwork — GitHub org (40 repos)
4. https://developers.quip.network/docs/compute/submit-a-job — Compute job docs
5. https://github.com/QuipNetwork/ethereum-sdk — EVM SDK repo
6. https://developers.quip.network/docs/getting-started/quip-sdk — SDK install guide
7. https://developers.quip.network/docs — Developer portal index
8. https://echoes.quip.network/ — Quantum Echoes (first QVRF consumer)

## Key Findings

### QVRF Status: NOT integrable via Node.js today

From the official QVRF docs page:
> "The request interface is not yet final, so no function names or parameters appear here."
> "Integration documentation with installable packages and code examples will follow once those details settle."

From the QVRF product page (https://quip.network/qvrf/):
- **"What is shipped"**: Quantum execution, Merkle commitment, audit pipeline — LIVE
- **"What is next"**: On-chain verification contracts (IN DEVELOPMENT), Trustee distribution (IN DEVELOPMENT)
- No public API endpoint exists
- No npm package exists for QVRF

### Available Node.js SDKs

From https://developers.quip.network/docs/getting-started/quip-sdk:
- `@quip.network/ethereum-sdk@beta` — EVM account client (post-quantum accounts). NOT QVRF.
- `@quip.network/hashsigs-wasm@rc` — Hash-based signatures (SHRINCS). NOT QVRF.
- "There is no public `@quip.network/quip-swap` or `@quip.network/sdk` package"
- The only SDK for submitting compute jobs is Python: `xquad` + `xqsa`

### Why QVRF cannot be called from Node.js

1. **No API endpoint published.** QVRF is a subnet of Quip Network; access goes through the coordinator, but no public endpoint address exists.
2. **No SDK or npm package.** The QVRF request interface is explicitly described as "not yet final."
3. **Payment rail not public.** QVRF uses QuipSwap for payment, but the swap SDK is not published ("There is no public @quip.network/quip-swap package").
4. **Only current consumer is first-party.** Quantum Echoes (echoes.quip.network) consumes QVRF but uses it internally; no public API wrapping it.
5. **The compute subnet SDK is Python-only.** `xquad`/`xqsa` are pip packages, not npm.

## What I Built Instead

A Node.js raffle service that:
1. Uses `crypto.randomBytes()` (OS-level CSPRNG) for randomness — cryptographically secure
2. Implements an adapter pattern with a `QVRFRandomnessProvider` interface
3. Includes a stub `QuipQVRFProvider` that documents exactly what needs to change
   when the QVRF API ships
4. Wraps everything in an Express HTTP service with endpoints for creating raffles
   and picking winners
5. The architecture is "swap-ready" — replacing the randomness source is a one-line config change

## Commands That Mattered

```
npm init -y
# Installed @quip.network/ethereum-sdk@beta to check for QVRF APIs — confirmed it's
# only for EVM accounts, not randomness
npm install @quip.network/ethereum-sdk@beta
node -e "const sdk = require('@quip.network/ethereum-sdk'); console.log(Object.keys(sdk))"
# Result: ERR_PACKAGE_PATH_NOT_EXPORTED (ESM-only, no CJS export)
# This confirms: even the available SDK doesn't expose QVRF functionality
```

## Dead Ends

- Searched npm for "quip network qvrf" — no package exists
- Checked ethereum-sdk exports — no randomness API (ESM-only, no CJS export)
- Checked Quantum Echoes site — it's a minting UI, not an API
- No Swagger/OpenAPI docs anywhere on developers.quip.network
- No public testnet RPC/WebSocket URL published

## Commands That Mattered (final)

```
npm init -y
npm install express
node test.js          # 1010 tests, 1010 passed
node server.js        # Express on :3456
curl localhost:3456/health  # → {"status":"ok",...}
curl -X POST localhost:3456/raffles -d '{"title":"Dev Conf 2026","entries":[{"name":"Alice"},{"name":"Bob"}]}'  # → 201
curl -X POST localhost:3456/raffles/<id>/draw  # → {"winner":{"name":"Bob",...}}
```
