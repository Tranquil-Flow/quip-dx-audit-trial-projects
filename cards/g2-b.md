# g2-b

- **Round:** Round 3
- **Model:** MiniMax-M3
- **Task:** Hybrid signatures with pqhybridsign
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Hybrid signatures with pqhybridsign | MiniMax-M3 | pqhybridsign (rc9) | Built and working (off-chain) | 7 min | Not in the developer docs; the npm README is a stub [C-SDK-14, C-R5-03]. Independently rebuilt and confirmed; one rebuild found the write-up overstated a cross-process check. |

## Trial card

- **Model:** MiniMax-M3.
- **What it does:** A Node library and `quip-sig` CLI (info, keygen, sign, verify) that signs a canonical JSON envelope of an HTTP request with the ED-ML-44 hybrid suite under a context label. Demo scripts cover a single-process round trip, deterministic signing, signing in one subprocess and verifying in another, and five tamper variants. Entirely off-chain.
- **Quip products and integration:** `@quip.network/pqhybridsign` (rc9) — NATIVE.
- **Evidence:** Off-chain, so no transactions. First rebuild: works; every claimed output reproduced, and a direct call confirmed verification fails for a wrong context, key or message. Second rebuild: works for the overall claim, but it found the builder's write-up overstated "cross-process signature-byte identity" (the determinism demo signs twice inside one process and the cross-process check compares only public keys). The first rebuild also noted the CLI `verify` takes the signer's seed file, so the verifying process holds the private key material, which is not a realistic setup.
- **Time:** 7 min.
- **What got in the way:** The package is not documented on the developer docs [[C-SDK-14](https://developers.quip.network/docs/llms-full.txt)]. The npm README is a short stub without the suite-to-wire-label mapping [[C-R5-03](https://unpkg.com/@quip.network/pqhybridsign@0.0.0-rc9/README.md)].
