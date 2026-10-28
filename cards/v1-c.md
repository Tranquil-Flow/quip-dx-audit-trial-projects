# v1-c

- **Round:** Round 3
- **Model:** MiMo-V2.5
- **Task:** Frontend dev (screenshot-only): PQ signing in Next.js
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Frontend dev (screenshot-only): PQ signing in Next.js | MiMo-V2.5 | hashsigs-wasm (browser) | Partly working: browser signing works, but the server route does not actually verify | 100 min | [C-R4-01, C-SDK-06]. Both rebuilds rated it partly working; the server route accepted forged signatures. |

## Trial card

- **Model:** MiMo-V2.5.
- **What it does:** A Next.js page that loads the `hashsigs-wasm` module in the browser, makes a random SPHINCS+C keypair, pads the message to 32 bytes, signs and verifies locally. A "Verify on Server" button posts to an API route that does not verify anything: it returns success whenever the hex lengths look plausible. The run ran out of time before writing its report, so it was assessed from its files.
- **Quip products and integration:** `@quip.network/hashsigs-wasm` browser signing through raw wasm exports — NATIVE; server-side verification — NONE (simulated).
- **Evidence:** Off-chain. Screenshots show "Local verification: PASSED" and "Server verification: PASSED". The UI and its "How It Works" text claim the server verifies with the same WASM library; that is false, and in a rebuild the route accepted an all-zero 5000-byte signature with a random key. First rebuild: partly working (browser flow works, backend verification not implemented). Second rebuild: partly working. Browser signing and an independent WASM verification worked, but the backend only simulates verification and accepts altered and forged signatures.
- **Time:** 100 min (ran out of time).
- **What got in the way:** The documented import fails in the browser [[C-R4-01](https://github.com/QuipNetwork/hashsigs-rs/blob/0c878e8443c342751e13123529f63a4f2330ce6c/ts/README.md#L28)]. The Quickstart points TypeScript users to legacy WOTS+ libraries it calls "preferred" [[C-SDK-06](https://developers.quip.network/docs/getting-started/quickstart#:~:text=the%20preferred%20Winternitz%20One-Time%20Signature)].
