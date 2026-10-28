# g2-a

- **Round:** Round 3
- **Model:** GPT-5.6
- **Task:** Hybrid signatures with pqhybridsign
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Hybrid signatures with pqhybridsign | GPT-5.6 | pqhybridsign (rc9) | Built and working (off-chain) | 9 min | `latest` is rc1, with different suite names, and the README's install line gets it [C-R5-02, C-R5-01, C-SDK-14]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-5.6.
- **What it does:** A TypeScript library and `quip-api-sign` CLI (keygen, sign, verify, canonicalize). It builds a canonical form of an HTTP request (method, path and query, timestamp, nonce, SHA-256 of the body) and signs it with Quip's ED-ML-44 hybrid (ed25519 plus ML-DSA-44). A demo signs in one process and verifies in another, and shows a tampered body being rejected. Entirely off-chain.
- **Quip products and integration:** `@quip.network/pqhybridsign` (pinned to 0.0.0-rc9, the `next` tag) — NATIVE.
- **Evidence:** Off-chain, so no transactions. First rebuild: works. A clean install passed the 5 tests; the demo showed a 2484-byte signature from one process verified in another, a valid request accepted and a tampered body rejected. Second rebuild: works, with every functional claim reproduced. Both noted that "two processes" means the same library in two Node processes, not a cross-implementation check.
- **Time:** 9 min.
- **What got in the way:** The npm `latest` tag is rc1, which uses different suite names, and the rc9 README's plain `npm install` line installs rc1, where its own ED-ML-44 example fails [[C-R5-02](https://registry.npmjs.org/-/package/@quip.network/pqhybridsign/dist-tags)]. The npm registry metadata carries no README text [[C-R5-01](https://registry.npmjs.org/@quip.network%2fquip-swap-sdk)]. The package is not in the developer docs [[C-SDK-14](https://developers.quip.network/docs/llms-full.txt)]. The README has no suite-name to wire-label mapping and no licence section [[C-R5-03](https://unpkg.com/@quip.network/pqhybridsign@0.0.0-rc9/README.md)].
