# h1-b

- **Round:** Round 2
- **Model:** GPT-5.6
- **Task:** Frontend dev: the browser signs and a Next.js backend verifies
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Frontend dev: the browser signs and a Next.js backend verifies | GPT-5.6 | hashsigs-wasm@rc | Built and working (off-chain, browser to server) | ~27 min | Same browser import problem, worked around with a webpack alias. It briefly tried the old `latest` version [C-R4-01, C-SDK-10]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-5.6.
- **What it does:** The same browser-sign/server-verify feasibility spike, plus a README documenting production gaps (key persistence, replay/nonce handling, AGPL licensing).
- **Quip products and integration:** `@quip.network/hashsigs-wasm@rc` — NATIVE.
- **Evidence:** Off-chain only. Two independent rebuilds confirmed valid/tampered verification results from a clean install. Our own re-run on 2026-09-29 also worked.
- **Time:** 27 min.
- **Key Quip call** (`demo/src/app/api/verify/route.ts:42-46`):
```ts
// The server hashes the received text itself; it does not trust a client-supplied digest.
const messageBytes = new TextEncoder().encode(body.message);
const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", messageBytes));
const { profileName, shrincs } = await loadHashSigs();
const valid = shrincs.verify(signature, digest, publicKeyCommitment);
```
- **What got in the way:** Same broken browser export condition as `h1-a` [[C-R4-01](https://github.com/QuipNetwork/hashsigs-rs/blob/0c878e8443c342751e13123529f63a4f2330ce6c/ts/README.md#L28)], worked around with a webpack alias.

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
