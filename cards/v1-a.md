# v1-a

- **Round:** Round 3
- **Model:** Claude Sonnet 5.5
- **Task:** Frontend dev (screenshot-only): PQ signing in Next.js
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Frontend dev (screenshot-only): PQ signing in Next.js | Claude Sonnet 5.5 | hashsigs-wasm (SHRINCS) | Built and working (off-chain, browser to server) | 7 min | The documented import fails in a Next.js client bundle; the SDK page has no sign or verify snippet [C-R4-01, C-AGT-09, C-SDK-06]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** Claude Sonnet 5.5.
- **What it does:** A minimal Next.js 16 app. The browser generates a SHRINCS keypair, hashes a text message to 32 bytes, signs it with `hashsigs-wasm` and posts the digest, signature and key commitment to `/api/verify`, where a Node route verifies with the same package. Off-chain only.
- **Quip products and integration:** `@quip.network/hashsigs-wasm` (SHRINCS) — NATIVE.
- **Evidence:** Off-chain. The final screenshot shows a 2784-byte signature, 1023 signatures remaining and the server returning ok; another shows the documented import failing before the workaround. First rebuild: works (install from lockfile, `next build`, `next start`). Second rebuild: works (clean install, production build, browser signing and server check); it noted that `/api/verify` ignores the `message` field, so the server checks a signature over a digest, not the displayed message. The builder's workaround depends on an internal file path through a bundler alias.
- **Time:** 7 min.
- **What got in the way:** The documented `hashsigs-wasm` quick-start import fails in a Next.js client bundle [[C-R4-01](https://github.com/QuipNetwork/hashsigs-rs/blob/0c878e8443c342751e13123529f63a4f2330ce6c/ts/README.md#L28)]. The SDK docs page has only an install line and no sign or verify snippet [[C-AGT-09](https://developers.quip.network/docs/llms-full.txt)]. The Quickstart sends TypeScript users to the legacy WOTS+ package it calls "preferred" [[C-SDK-06](https://developers.quip.network/docs/getting-started/quickstart#:~:text=the%20preferred%20Winternitz%20One-Time%20Signature)], and a plain install resolves an old build [[C-SDK-10](https://www.npmjs.com/package/@quip.network/ethereum-sdk?activeTab=versions)]. The `hashsigs-rs` README says callers must resupply a 164-byte public-key bundle on each verify, while the TypeScript API verifies against the 32-byte commitment [[C-R5-18](https://github.com/QuipNetwork/hashsigs-rs/blob/main/README.md)]. The 32-byte message requirement appears only in the package README [[C-TRL-02](https://cdn.jsdelivr.net/npm/@quip.network/hashsigs-wasm@0.2.1-rc9/README.md)].
