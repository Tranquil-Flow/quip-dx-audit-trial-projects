# RESULT

## Status: WORKING

A small local proof of concept now signs a message in a real browser with Quip's current post-quantum SHRINCS WASM package and verifies it independently in a Next.js backend route.

“WORKING” applies to this local cryptographic demo, not production readiness. The package is release-candidate software, its browser package export needed a workaround, the license is AGPL-3.0-or-later, and an authentication/authorization integration needs substantial state and replay controls.

## What I built

Project: `./demo`

- `src/app/page.tsx`: client component that creates a fresh CSPRNG seed, derives a throwaway SHRINCS key, SHA-256-hashes the message, signs in browser WASM, and sends only message/signature/public commitment to the backend.
- `src/app/api/verify/route.ts`: Node route that validates input, independently hashes the UTF-8 message, loads the Quip verifier, and returns the boolean verdict.
- `next.config.ts`: narrowly scoped Webpack alias around the rc9 browser-export packaging bug.
- `scripts/browser-e2e.mjs`: CDP smoke test used to click the real page in headless Chrome.
- `keys/README.md`: key-handling policy; no key material is stored or checked in.
- `README.md`: run instructions and production/security gaps.

No blockchain, wallet, RPC, testnet, mainnet, tokens, or money were needed. No transaction was submitted and there are no transaction hashes, addresses, or job IDs.

## How to run

```sh
cd demo
npm install
npm run dev
```

Open `http://localhost:3000` and click **Generate key, sign, and verify**.

Validation commands:

```sh
npm run lint
npm run build
```

The project intentionally runs Next.js with Webpack. Turbopack currently exposes the vendor package's broken browser export and fails the build.

## Evidence

### Documented API smoke test

Using `@quip.network/hashsigs-wasm@rc` (`0.2.1-rc9`) in Node:

- runtime profile: `shrincs-256s-keccak`
- verification: `true`
- signature: 2,784 bytes
- public commitment: 32 bytes
- state advanced from leaf 1 to leaf 2; 3 of the demo's 4 leaves remained

### Real browser → Next.js backend

The headless-Chrome click test returned:

- status: `Backend verification succeeded.`
- backend verdict: `VALID`
- profile: `shrincs-256s-keccak`
- signature: 2,784 bytes
- SHA-256 digest: `475a1fb7ef13e7208767ebb4d7b9e45ec48ef21a9610db929bf8ea8fdc534842`
- public commitment: `d7190b38e1b8a3998d1ccccf5848d46f00adccf6955b357cda8f267ec65bfa86`

This confirms the browser produced a signature that the separately executing route verified. The private seed/key was never sent in the request.

### Negative/tamper test

The same signature and commitment were submitted for two messages:

- `tamper test` → HTTP 200, `valid: true`
- `tamper test!` → HTTP 200, `valid: false`

This confirms the route recomputes the digest and rejects a changed message.

### Build quality

- `npm run lint` → passed with no warnings
- `npm run build` → passed; `/` prerendered and `/api/verify` emitted as a dynamic route
- `npm audit` during installs → 0 vulnerabilities reported

## What did not work and why

1. The docs-recommended `@rc` currently resolves to `0.2.1-rc9`, but its root package export maps the `browser` condition directly to `loader.browser.js`. That module exposes only the low-level `loadShrincsWasm`, so the documented high-level `loadHashSigs` export vanishes in Next.js client builds.
2. Turbopack fails hard on that mismatch. Webpack also warned until `next.config.ts` aliased the package root to the package's published high-level `dist/index.js`; the package's own internal browser loader substitution then worked.
3. The npm page shows `latest` (`0.1.0-rc1`) and has no README. Trying that exact version also failed because it predates `loadHashSigs`.
4. I did not implement durable keys. Production stateful signing requires atomic persistence after every signature plus an external monotonic high-water mark so a restored backup cannot reuse a leaf. This is a major operational design concern for multi-tab, multi-device, retry, crash, and backup behavior.
5. I did not turn signature validity into authentication. A secure design needs a registered expected commitment and a canonical signed payload containing domain/purpose, server nonce, subject, issued-at/expiry, and any action data, plus one-time nonce/replay storage.
6. I did not locate a public audit report tied to the current SHRINCS code/version. The package README calls the Rust implementation audited, while an April 2026 vendor post says a third-party audit was in progress for the earlier WOTS+ wallet. Those are not enough to establish current audit scope.
7. The default 256s signature is relatively large (2,784 bytes in this stateful demo). Vendor docs say 128s signatures are smaller but browser keygen/signing can take tens of seconds. Profile selection needs product-specific latency/payload/security analysis.
8. Browser keys remain readable by XSS, compromised same-origin dependencies, or hostile extensions. Browser signing does not create a hardware-backed trust boundary.
9. AGPL-3.0-or-later may be incompatible with the team's distribution/deployment model. Legal review is required.

## Feasibility conclusion

Technically: yes, browser signing and backend verification can be added to a React/Next.js application, and the core flow works today with the current rc package after a small bundler workaround.

Product/production recommendation: continue only as an explicitly experimental spike until Quip fixes the browser export, publishes a stable release and clearly scoped audit, and the team designs key-state persistence, anti-rollback, commitment enrollment, canonical payloads, replay protection, XSS hardening, recovery, and licensing posture. The stateful-key lifecycle is the hardest part—not calling `sign` or `verify`.

## Top 5 vendor docs/site changes

1. **Fix the npm browser export and publish a Next.js-tested release.** The documented `loadHashSigs` import should work unchanged under both Turbopack and Webpack; add those builds to package CI.
2. **Put a complete current quick start on npm and align every entry page.** Show the `@rc` install, browser sign, Node verify, 32-byte pre-hash step, base64 transport, exact tested version, and explicitly label WOTS+ as legacy on the main quickstart.
3. **Provide a production authentication example, not only primitive calls.** Include canonical serialization, domain separation, server nonce, expiry, replay storage, commitment enrollment, request limits, and negative/tamper tests.
4. **Provide a concrete stateful-key architecture guide.** Cover atomic persistence-before-use, crash recovery, anti-rollback high-water marks, tabs/devices/concurrency, backup restore, leaf exhaustion, reset/rotation, and when to use the stateless path.
5. **Publish and link security maturity evidence.** Link the audit report with auditor, scope, commit hash/version, findings/remediation, clearly state SHRINCS's review/standardization status, and put the AGPL implications and release-candidate warning next to installation.
