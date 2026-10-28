# m2-b

- **Round:** Round 2
- **Model:** DeepSeek V4 Flash
- **Task:** OTC desk: PQ-signed orders settled through QuipSwap
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| OTC desk: PQ-signed orders settled through QuipSwap | DeepSeek V4 Flash | hashsigs-wasm, ethereum-sdk; a self-written escrow | Partly working: settled through a self-written escrow (not Omnibus) on a fork | ~22 min | Took the "no swap SDK" sentence as decisive [C-SWP-03]. Rebuilds differ (works / partial). |

## Trial card

- **Model:** DeepSeek V4 Flash.
- **What it does:** Each party signs the order off-chain with a SHRINCS key (a key bundle separate from its wallet's signing key), then the two parties' Quip SHRINCS smart wallets execute commit/reveal/reclaim calls against a self-written hash-lock escrow (not Omnibus). As deployed, only `commit` is gated, and it accepts only Quip-factory wallets as callers; `execute` and `reclaim` are open to any caller. The escrow does not check the off-chain order signatures.
- **Quip products and integration:** `hashsigs-wasm` order signing — NATIVE; `ethereum-sdk` SHRINCS wallets — NATIVE, fork only; settlement contract — FALLBACK (the agent believed QuipSwap had no testnet deployment it could use, so it wrote its own).
- **Evidence:** Local anvil fork only, no public transactions. Two independent rebuilds: one reproduced the fork flow; the other also reproduced it and rated the project partly working.
- **Time:** 22 min.
- **Key Quip call** (`src/flow.mjs:214-219`):
```js
const commitData = (leg) => encodeFunctionData({ abi: settlementAbi, functionName: "commit", args: [T, leg, "0x", "0x"] });
const legKey = (leg) => null;

log("maker commits leg A (1 ETH)...");
const tx1 = await wallets.A.execute({ target: settlement, value: parseEther("1"), data: commitData(mA) });
log("  tx:", tx1.transactionHash, "status:", tx1.status);
```
- **What got in the way:** The SDK page's own text says "no swap SDK is published today," which the agent took as decisive and never found the real `quip-swap-sdk` package [[C-SWP-03](https://developers.quip.network/docs/getting-started/quip-sdk#:~:text=no%20swap%20SDK%20is%20published%20today)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
