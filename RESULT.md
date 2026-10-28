# RESULT

## Status: PARTIAL

The raffle service works but uses `node:crypto` CSPRNG, not Quip Network's QVRF.
QVRF integration is **not possible today** — see "Why QVRF is blocked" below.

## What was built

A Node.js Express service with:
- Pluggable randomness backend (adapter pattern)
- `CSPRNGProvider` — uses `crypto.randomBytes` (OS-level CSPRNG)
- `QuipQVRFProvider` — stub that throws with docs URL and exact steps needed
- HTTP API for raffle lifecycle (create, add entries, draw winner)
- 1010 unit tests (uniformity, lifecycle, QVRF stub validation)

## How to run

```bash
cd /private/tmp/devtrials2/t08-mimo-v2.5
npm install        # express only
npm test           # runs unit tests
node server.js     # starts on :3456
```

## API endpoints

```
GET  /health                          → service status
POST /raffles                         → create raffle (body: {title, entries})
POST /raffles/:id/entries             → add entry (body: {name, address?})
POST /raffles/:id/draw                → pick winner (quantum-secured when QVRF ships)
GET  /raffles/:id                     → get raffle details
GET  /raffles                         → list all raffles
```

## Evidence (test output)

```
=== QVRF stub ===
  PASS: QVRF stub throws helpful error
  PASS: error includes docs URL
=== CSPRNG provider ===
  PASS: all 10 values seen in 1000 draws (uniformity)
=== Raffle lifecycle ===
  PASS: 3 initial entries
  PASS: uses CSPRNG by default
  PASS: 4 after adding Dave
  PASS: winner index 2 valid
  Winner: Carol (index 2)
=== Duplicate draw ===
  PASS: cannot draw twice
=== Large raffle (100 entries, 10000 draws) ===
  PASS: uniformity OK (min=83, max=122, avg=100)
1010 tests, 1010 passed, 0 failed
```

## HTTP API evidence

```json
// POST /raffles → create raffle
{
    "id": "388df91b-8f66-46f5-9cac-1dca3421f725",
    "title": "Dev Conference 2026",
    "entries": [{"name": "Alice"}, {"name": "Bob"}, {"name": "Carol"}],
    "randomnessProvider": "CSPRNG (node:crypto.randomBytes)"
}

// POST /raffles/:id/draw → pick winner
{
    "winner": {
        "name": "Carol",
        "index": 2,
        "drawnAt": "2026-09-28T09:27:18.000Z",
        "randomnessSource": "CSPRNG (node:crypto.randomBytes)"
    },
    "winnerIndex": 2,
    "totalEntries": 4
}
```

## Why QVRF is blocked (5 reasons)

1. **No public API endpoint.** QVRF is a Quip Network subnet; access requires
   a coordinator WebSocket URL that has not been published. The compute subnet
   docs note: "Connection details for the public test network have not been
   published yet."
   Source: https://developers.quip.network/docs/compute/submit-a-job

2. **Request interface not final.** Quip's own docs state:
   "The request interface is not yet final, so no function names or parameters
   appear here."
   Source: https://developers.quip.network/docs/compute/qvrf

3. **No SDK or npm package.** There is no `@quip.network/qvrf` package.
   The only published npm packages are:
   - `@quip.network/ethereum-sdk@beta` — EVM account client (not QVRF)
   - `@quip.network/hashsigs-wasm@rc` — hash-based signatures (not QVRF)
   Neither exposes any randomness API.
   Source: https://developers.quip.network/docs/getting-started/quip-sdk

4. **Payment rail (QuipSwap) not public.** QVRF uses QuipSwap for payment,
   but: "There is no public @quip.network/quip-swap or @quip.network/sdk
   package, and no swap SDK is published today."
   Source: https://developers.quip.network/docs/getting-started/quip-sdk

5. **V0 is operator-only.** "In V0, Quip operates both the randomness
   generator and the delivery service." On-chain verification contracts are
   "in development."
   Source: https://quip.network/qvrf/

## What did not work

- `@quip.network/ethereum-sdk@beta` installed but is ESM-only and has no
  QVRF exports — it's for post-quantum account signing, not randomness
- No Python SDK either would help here (we're building Node.js); the
  compute SDK is Python-only (`xquad`/`xqsa`)
- Quantum Echoes (echoes.quip.network) is a minting UI, not a public API
- No Swagger/OpenAPI docs exist anywhere on the developer portal

## What would make this easier

1. **Publish a `@quip.network/qvrf` npm package** with the request/response
   interface (even if it throws "not yet available" until the network is
   ready)
2. **Document the QVRF coordinator WebSocket URL** for testnet
3. **Publish the fee model** so integrators know the cost per randomness
   request
4. **Provide a REST proxy** for QVRF (the current interface is callback-based
   for smart contracts; a REST endpoint would serve off-chain use cases like
   this raffle service)
5. **MCP server** — Quip docs mention one exists at `/docs/getting-started/use-with-ai`
   but it wasn't needed for this task
