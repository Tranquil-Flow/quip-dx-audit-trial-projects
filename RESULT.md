# Result

## Overall: WORKING

A TypeScript library and executable CLI now generate fresh hybrid keys, sign versioned API-request messages through Quip Network's `@quip.network/pqhybridsign`, and verify them in an independent process. The implementation is local-only; it did not use a blockchain, wallet, browser, Docker, testnet, mainnet, or real funds.

## Component status

| Component | Status | Notes |
|---|---|---|
| Quip package integration | WORKING | Exact dependency `@quip.network/pqhybridsign@0.0.0-rc9`; Node/WASM API exercised, not mocked |
| Raw message library | WORKING | `signMessage` / `verifyMessage` with mandatory caller-provided domain context |
| API request library | WORKING | Signs method, exact path/query target, canonical timestamp, nonce, and SHA-256 of exact body bytes |
| Key/envelope formats | WORKING | Versioned JSON, canonical base64url, key IDs, strict parsing, no persisted derivation seed |
| CLI | WORKING | `keygen`, `sign`, `verify`, `canonicalize`, and `help`; documented exit codes |
| Replay-window checks | WORKING | Configurable age and future-skew checks; durable nonce replay cache deliberately left to the API server |
| Separate-process interop | WORKING | Signer PID and verifier PID differed; authentic body passed and changed body failed |
| Automated tests | WORKING | 5/5 tests passed, including changed message/context/body/method/target/signature and time-policy cases |
| Build/package checks | WORKING | TypeScript build passed; executable bit and key modes verified; npm package dry run passed |
| Testnet/on-chain work | NOT APPLICABLE | This request only requires local request signing; no addresses, transactions, hashes, jobs, or funds exist |

## How to run

Requirements: Node.js 20 or later.

```sh
npm ci
npm test
npm run demo
```

The demo is the shortest end-to-end proof. Each run creates a new throwaway key under `./keys`, starts one CLI process to sign and another to verify, then attempts verification with a tampered body.

Manual CLI flow:

```sh
npm run build

node dist/cli.js keygen \
  --private keys/client.private.json \
  --public keys/client.public.json

printf '%s' '{"amount":1250,"currency":"USD"}' > keys/request.body

node dist/cli.js sign \
  --key keys/client.private.json \
  --method POST \
  --target '/v1/payments?mode=test' \
  --body-file keys/request.body \
  --out keys/request.signature.json

node dist/cli.js verify \
  --key keys/client.public.json \
  --signature keys/request.signature.json \
  --method POST \
  --target '/v1/payments?mode=test' \
  --body-file keys/request.body
```

Valid verification exits 0; invalid authentication exits 1; usage/format/runtime errors exit 2. Full API examples and deployment guidance are in `README.md`.

## Final evidence

Final `npm test`:

- tests: 5
- passed: 5
- failed: 0
- suites failed: 0

Final `npm run demo`:

```json
{
  "working": true,
  "suite": "ED-ML-44",
  "keyId": "tqzPZU-ykTY_IiEaMMa5UdgwY3dROOO1PqM4cYzXAQY",
  "signatureBytes": 2484,
  "signerPid": 5777,
  "verifierPid": 5792,
  "validRequestAccepted": true,
  "tamperedBodyRejected": true,
  "tamperReason": "request body digest mismatch"
}
```

Generated demo artifacts:

- `keys/demo-client.private.json` — mode `0600`, ignored by Git rules
- `keys/demo-client.public.json` — mode `0644`
- `keys/demo-request.body`
- `keys/demo-request.signature.json` — mode `0644`

Additional checks:

- `npm audit --omit=dev`: 0 vulnerabilities reported
- `npm pack --dry-run --json`: success; 11 expected package files, executable CLI included
- `npm ls --all`: pinned Quip `0.0.0-rc9`, TypeScript `7.0.2`, Node types `26.6.3`
- `dist/cli.js`: mode `0755`

No transaction hashes, blockchain addresses, faucet receipts, or remote job IDs exist because none were required or created.

## Signed construction

The selected `ED-ML-44` suite AND-composes classical ed25519 and post-quantum ML-DSA-44. The wrapper signs compact UTF-8 JSON with these ordered fields:

- format version
- normalized HTTP method
- exact origin-form target (path and query)
- canonical UTC timestamp
- nonce
- base64url SHA-256 digest of the exact body bytes

It uses a separate fixed Quip context, `quip-hybrid-api-request-signing-v1`. Verification reconstructs the message from the actual request, applies optional clock policy, and calls Quip's hybrid verifier. The wrapper never verifies either component independently.

## What did not work, and why

1. The project directory was not a Git repository, so the initial `git status` command failed. No Git operation was required for the deliverable.
2. Initial exact web searches for the npm package/API returned no search results. The official GitHub mirror and npm registry metadata supplied the needed sources.
3. Automated extraction of the npm package page and primary GitLab page returned no content. The public GitHub mirror README, docs.rs, npm registry, and installed package declarations were available alternatives.
4. The first TypeScript build failed with 16 `TS2591` errors because TypeScript 7 did not automatically include Node globals/types. Adding `"types": ["node"]` fixed it; subsequent builds passed.
5. `npm ls --all` displays unmet optional TypeScript native packages for other operating systems/architectures. The correct `darwin-arm64` package is installed, so these are expected optional entries, not failures.

All dead ends, commands, errors, consulted URLs, assumptions, and workarounds are recorded in `DEVLOG.md`.

## Remaining production concerns

- Quip labels the package and wire format pre-release. A production rollout should pin the tested version, stage upgrades, and be prepared for migration.
- The project has integration tests but no independent cross-implementation known-answer vectors; Quip's own docs identify that gap.
- A production verifier must durably reject reused `(keyId, nonce)` pairs across all API instances. Timestamp checks alone do not prevent replay within the accepted window.
- The signature does not bind HTTP authority or arbitrary headers. Scope public keys to one trust domain and extend the versioned profile before relying on such fields.
- This proof stores local private keys in files for demonstration. Production should use restricted secret storage or an isolated signing service and operational rotation/revocation.
- AGPL-3.0-or-later obligations apply; obtain appropriate legal review for network deployment.

## What would make Quip's docs/tools easier to use

1. Align npm installation guidance and tags. The repository says to use `@next`, registry `latest` still points to `rc1`, and the installed `rc9` package README says plain `npm install`, which resolves the older release.
2. Publish generated web documentation for the complete JavaScript API. Core usage is clear, but argument semantics, errors, supported suites, lengths, and complete return types currently require reading packaged `.d.ts` declarations.
3. Publish cross-language known-answer vectors for keys, contexts, messages, and signatures, with an explicit compatibility/version policy. The upstream README itself notes that these do not yet exist.
4. Freeze or formally version the composition wire format and provide an upgrade/migration guide before a stable release.
5. Add a CSPRNG-backed JavaScript `generateKeyPair()` convenience API. `keygenFromSeed` is valid but makes every application correctly source, copy, and dispose of seed bytes.
6. Provide a focused request-signing example or profile that covers canonical paths/query strings, body bytes, domain separation, timestamps, and replay nonces. Quip correctly supplies primitives, but each adopter otherwise has to design this security-sensitive layer independently.
7. Keep the prominent AGPL network-service notice from the repository README in the npm-specific README as well.
