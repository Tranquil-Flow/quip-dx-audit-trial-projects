# m2-a

- **Round:** Round 2
- **Model:** Claude Sonnet 5
- **Task:** OTC desk: PQ-signed orders settled through QuipSwap
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| OTC desk: PQ-signed orders settled through QuipSwap | Claude Sonnet 5 | hashsigs-wasm, Omnibus, ethereum-sdk; Quip's SHRINCS verifier on Base Sepolia | Partly working: PQ signatures verified live against Quip's verifier on Base Sepolia; settlement on a fork only | ~27 min | No Base Sepolia funding path; no QuipSwap address or ABI in the docs [C-ACC-03, C-TRL-13]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** Claude Sonnet 5.
- **What it does:** Maker and taker exchange SHRINCS-signed off-chain orders, derive identical QuipSwap terms, and settle a mUSDC-for-ETH trade through Omnibus using the keyed ERC-7913 commit route, plus a refund scenario.
- **Quip products and integration:** `hashsigs-wasm` signing — NATIVE; on-chain PQ signature verification against Quip's live SHRINCS verifier — NATIVE (live `eth_call`, not a fork); Omnibus settlement — NATIVE contract, fork only.
- **Evidence:** SHRINCS ERC-7913 verifier [0xF2f9E6D692da41b089c3c261c41509669eEc5567](https://base-sepolia.blockscout.com/address/0xF2f9E6D692da41b089c3c261c41509669eEc5567) on Base Sepolia, confirmed live via `eth_call`: the SDK's computed commit digest matched the on-chain `commitDigest()` and a valid PQ-signed commit passed while a tampered one reverted. Settlement itself ran on a local anvil fork only. Both independent rebuilds and our own re-run on 2026-09-29 reproduced the live check and the fork settlement.
- **Time:** 27 min.
- **Key Quip call** (`src/run.ts:111-116`):
```ts
const commit = async (who: "A" | "B") => {
  const [c, pq, party, cp] = who === "A" ? [cA, pqA, proposer, taker] as const : [cB, pqB, taker, proposer] as const;
  const signer = buildKeyedSigner(SHRINCS_VERIFIER, pq.commitment);
  const digest = computeCommitDigest({ lock, party, counterparty: cp, signer, omnibusAddress: dep.omnibusAddress });
  const onchainDigest = await c.getCommitDigest(lock, party, cp, keccak256(signer));
  if (onchainDigest !== digest) throw new Error("SDK commit digest != on-chain commitDigest()");
```
- **What got in the way:** Accounts and QuipSwap are deployed on Base Sepolia, but the developer docs give no way to fund an account there; Quip's faucet funds only Aglais [[C-ACC-03](https://developers.quip.network/llms.txt#:~:text=Dispenses%2010%20AGLS%2C%20rate%2Dlimited%20per%20destination)]. The QuipSwap page gives no address or ABI [[C-TRL-13](https://developers.quip.network/docs/quip-interlock-protocol/quipswap)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
