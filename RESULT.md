# RESULT

## Status: WORKING

Yes, mechanically: Quip Network's published TypeScript WOTS+ package can run in a Next.js client component, sign a message digest in the browser, serialize the public material, and verify it in a Node.js route. I built and exercised that complete boundary.

This is a successful feasibility demo, not yet a production authentication design. The important distinction is:

- **Raw signing/verifying works.**
- **A secure product protocol still needs design.** WOTS+ keys are one-time, an ad-hoc public key proves no user identity, replay/domain separation are not defined, the package is AGPL, and the vendor's conceptual docs say full Quip architecture should wrap a classical primitive such as ECC with WOTS.

## What I built

A self-contained Next.js 16 + React 19 + TypeScript app in:

`/private/tmp/devtrials7/v1-gpt-5.6-sol`

Key files:

- `app/page.tsx` — client-side Web Crypto seed generation, Keccak-256 message hashing, WOTS+ key generation/signing, best-effort private-material zeroization, API call, success/tamper UI.
- `app/api/verify/route.ts` — Node.js backend endpoint.
- `lib/protocol.ts` — explicit algorithm/version name and signature flatten/split transport helpers.
- `lib/server-verify.ts` — strict envelope parsing, canonical base64 checks, exact length checks, server-side rehash, verification.
- `lib/server-verify.test.ts` — boundary tests.
- `README.md` — runbook, wire format, and production caveats.
- `vendor/hashsigs-ts` — official repository cloned from the URL copied from its visible GitHub page; retained for source/test research.
- `DEVLOG.md` — every web page/screenshot and material command in order.
- `FRICTION.md` — documentation/package/product friction encountered.

### Demo flow

1. The browser generates a fresh random 32-byte private seed and 32-byte public seed using `crypto.getRandomValues`.
2. It constructs `WOTSPlus(keccak_256)` from `@quip.network/hashsigs@0.1.0`.
3. It hashes the UTF-8 message with Keccak-256 because this WOTS+ API signs a 32-byte digest, not arbitrary-length text.
4. It generates one keypair, signs once, flattens the 67 × 32-byte signature chunks, and base64-encodes the public data.
5. It best-effort zeroizes the private seed and derived private key before the request.
6. It posts only `algorithm`, `message`, `publicKey`, and `signature` to `/api/verify`.
7. The backend applies strict schema/encoding/length validation, recreates the message hash, restores the signature chunks, and calls `WOTSPlus.verify`.
8. A second UI action deliberately changes the message while reusing the public key/signature; the backend returns `valid: false`.

Demo-defined JSON envelope:

```json
{
  "algorithm": "WOTS+-KECCAK256-W16",
  "message": "Hello",
  "publicKey": "<64 bytes, canonical base64>",
  "signature": "<2144 bytes, canonical base64>"
}
```

This wire format is local to the demo; I found no vendor-specified browser/backend envelope.

## How to run it

```bash
cd /private/tmp/devtrials7/v1-gpt-5.6-sol
npm install
npm test
npm run typecheck
npm run dev
```

Open `http://localhost:3000`.

1. Click **Generate one-time key → Sign → Verify**.
2. Confirm **SIGNATURE VALID**.
3. Click **Tamper with message and verify again**.
4. Confirm **SIGNATURE INVALID**.

Production mode:

```bash
npm run build
npm start
```

No wallet, chain, testnet funds, key file, RPC endpoint, or public post is needed for this message-signing boundary demo.

## Evidence

### Automated

- `npm test` passed: **11 tests in 2 files**. This includes the demo's four boundary tests (valid envelope, changed message, malformed public-key length, and rejection of an unexpected `privateKey` field) plus seven tests discovered in the cloned vendor repository.
- `npm run typecheck` passed with no errors.
- `npm run build` passed with Next.js 16.3.8. Build output classified `/` as static and `/api/verify` as a dynamic server route.
- The production server reached **Ready** on `http://localhost:3000`.

### Real browser, positive path

Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0023.png`

The final production build displayed:

- `SIGNATURE VALID`
- Algorithm: `WOTS+-KECCAK256-W16`
- Public key: **64 bytes**
- Signature: **2,144 bytes**
- Browser work in that run: **10.9 ms**
- API round trip in that run: **24.0 ms**

These timings are one local run, not a benchmark.

### Real browser, negative/tamper path

Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0024.png`

The same public key/signature with a changed message displayed:

- `SIGNATURE INVALID`
- API round trip in that run: **15.4 ms**

The transport-only view, with no private field, is visible in `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0020.png`.

### Research provenance

- Official Quickstart identifying WOTS+ as preferred and linking the TypeScript package: screenshots `0006.png` and `0007.png`.
- Officially linked npm package/version/install/license: `0008.png` and `0009.png`.
- Official GitHub repository and copied Clone dropdown: `0010.png` and `0011.png`.
- Official architectural statement about wrapping ECC with WOTS: `0017.png`.
- Full paths and observations: `DEVLOG.md`.

### Transactions / addresses / jobs

None. This demo intentionally performs local detached message signing and backend verification only; it does not touch Aglais, Base Sepolia, mainnet, a wallet, or a Quip transaction.

## What I learned

- The official TypeScript package is `@quip.network/hashsigs`; latest is 0.1.0 on the visible npm page.
- Its public API is a small `WOTSPlus` class. The usage pattern had to be inferred from repository source/tests because the npm README has no API example.
- Default Keccak-256/W=16 parameters produce a 64-byte public key and a 2,144-byte signature (67 chunks of 32 bytes).
- The package bundles successfully into both sides of a modern Next.js app.
- WOTS+ is not a drop-in replacement for normal reusable account signatures. A key must sign only once. The demo takes the safest simple approach—fresh ephemeral key per click—but that also means the backend has no pre-existing reason to trust that key.
- For identity/authentication, the team must define how a user's public key is registered or certified, enforce one-time consumption atomically, and sign a domain-separated challenge containing at least origin/audience, purpose, nonce, expiry, user/session binding, and protocol version.
- The official conceptual docs describe hybrid classical + post-quantum wrapping. Standalone WOTS+ should not be presented as the complete Quip protocol.

## What did not work or remains unresolved

1. The README installation command `npm install hashsigs-ts` does not work; npm returned `E404`. The correct scoped package is `@quip.network/hashsigs`.
2. No official browser sign/server verify example, API reference, wire format, or prehash convention was found. The demo's transport is intentionally labeled local rather than vendor-standard.
3. No official application-level story was found for one-time key state, public-key identity binding, replay prevention, challenge construction, key rotation, or concurrency/race handling.
4. The package is `AGPL-3.0-or-later`. A proprietary Next.js deployment needs legal review before adoption, especially because the code is delivered to browsers.
5. `@quip.network/hashsigs@0.1.0` declares build/test packages (`tsup`, TypeScript, Vitest, Node types) as runtime dependencies. After removing the demo's directly fixable critical patch-level issue, `npm audit --omit=dev` still reports **4 vendor-tree findings (1 low, 3 moderate)**. They concern tooling the signature runtime does not call, but the dependency hygiene should be fixed by the publisher rather than hand-waved by consumers.
6. Version/maturity signals are unclear: npm exposes 0.1.0 while the repository has 0.2.0 release-candidate tags. I did not find stability, audit, or compatibility guarantees.
7. No external cryptographic review was performed here. Passing package tests and an end-to-end demo demonstrates interoperability, not cryptographic assurance.

## Recommendation

Proceed only as a technical spike or vendor-evaluation input. The browser/server integration itself is straightforward and fast enough for ordinary UI use. Before production, ask Quip for a supported higher-level protocol or SDK that handles many-time signing/state, hybrid binding, identity, replay protection, canonical encoding, and key rotation. In parallel, obtain AGPL guidance and an independent security review.

If the product requirement is merely an experimental, detached, one-off proof with an already trusted public key, this demo is a viable starting point. If the requirement is login/session authentication or repeated signing, do not ship the raw WOTS+ pattern as-is.

## Top 5 vendor docs/site/package changes that would have helped most

1. **Fix and expand the TypeScript quickstart.** Replace the broken `npm install hashsigs-ts` command with `npm i @quip.network/hashsigs` and include a tested browser-sign/Node-verify example with exact imports and required 32-byte prehashing.
2. **Put one-time-key safety first.** Add a prominent warning beside every `sign` example, explain the failure mode of key reuse, and provide a supported stateful/many-time lifecycle design with atomic consumption and rotation.
3. **Publish a canonical application protocol.** Specify domain-separated message bytes, challenge/replay fields, algorithm/version negotiation, base64/hex rules, signature chunk layout, identity binding, public-key registration, and cross-language vectors.
4. **Clarify scope, maturity, and assurance.** State clearly where raw WOTS+ ends and Quip's hybrid ECC+WOTS architecture begins; publish API stability/version compatibility, release notes, supported browsers/runtimes, threat model, and audit status.
5. **Clean up package and licensing ergonomics.** Move TypeScript/tsup/Vitest/Node types to `devDependencies`, ship only runtime artifacts, resolve audit noise, expose proper package `exports`, and explain AGPL obligations for browser and server integrations from the official Quickstart.
