# h1-a

- **Round:** Round 2
- **Model:** Claude Sonnet 5
- **Task:** Frontend dev: the browser signs and a Next.js backend verifies
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Frontend dev: the browser signs and a Next.js backend verifies | Claude Sonnet 5 | hashsigs-wasm@rc | Built and working (off-chain, browser to server) | ~8 min | The README's browser import fails under Next.js bundling; the app needed an undocumented alias and `serverExternalPackages` [C-R4-01, C-R4-02]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** Claude Sonnet 5.
- **What it does:** A Next.js app: a client page generates a SHRINCS key in the browser, signs a hashed message, and POSTs it to `/api/verify`, which re-hashes and verifies server-side.
- **Quip products and integration:** `@quip.network/hashsigs-wasm@rc` — NATIVE, both browser-side and server-side.
- **Evidence:** Off-chain only. Two independent rebuilds confirmed `valid:true` for a genuine signature and `valid:false` after tampering, in a clean install. Our own re-run on 2026-09-29 also worked.
- **Time:** 8 min.
- **Key Quip call** (`demo/src/app/page.tsx:14-23`):
```tsx
const { shrincs, shrincsImportSigningKey } = await loadHashSigs();
// DEMO ONLY: secret key in localStorage. Use a real key store in production.
const saved = localStorage.getItem(STORE);
let keys;
if (saved) {
  keys = shrincsImportSigningKey(Uint8Array.from(JSON.parse(saved)));
} else {
  keys = shrincs.keygen(crypto.getRandomValues(new Uint8Array(32)), 16);
  localStorage.setItem(STORE, JSON.stringify(Array.from(shrincsKeysToSecretBytes(keys))));
}
```
- **What got in the way:** `hashsigs-wasm`'s `browser` export condition resolves to a loader that has no `loadHashSigs`, so the README's import fails under Next.js bundling [[C-R4-01](https://github.com/QuipNetwork/hashsigs-rs/blob/0c878e8443c342751e13123529f63a4f2330ce6c/ts/README.md#L28)]. The app needed an undocumented bundler alias to build, and in this trial's setup `serverExternalPackages` for the server-side verify to run. The npm README and the quip-sdk page give no Next.js or bundler guidance [[C-R4-02](https://github.com/QuipNetwork/hashsigs-rs/blob/0c878e8443c342751e13123529f63a4f2330ce6c/ts/README.md)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
