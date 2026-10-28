# m5-b

- **Round:** Round 2
- **Model:** GPT-6
- **Task:** DAO treasury held in a Quip PQ account
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| DAO treasury held in a Quip PQ account | GPT-6 | ethereum-sdk (signing only) | Partly working: SHRINCS approval signing works; the account was never deployed | ~15 min | [C-ACC-01, C-ACC-03, C-ACC-06, C-SWP-03]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-6.
- **What it does:** Derives the counterfactual Quip smart-account address for a DAO treasury, probes live contract state and creation cost, and signs a DAO payout policy with the account's ERC-1271 SHRINCS key via the SDK's stateless-action API — account deployment, funding, the swap and the payout were never reached.
- **Quip products and integration:** `ethereum-sdk` `ShrincsSigner` (stateless-action signing) — NATIVE, used as intended over a custom payload; account creation and everything downstream — NONE.
- **Evidence:** No on-chain evidence — signing and address derivation only, never deployed. Both independent rebuilds confirmed `approve()` verifies true and a tampered amount verifies false, and that the counterfactual account address has no code and the live creation-cost estimate succeeds while the deploy itself is blocked by a zero-ETH owner. Our own re-run on 2026-09-29 reproduced the same results.
- **Time:** 15 min.
- **Key Quip call** (`prototype.mjs:57-65`):
```js
async function approve(recipient, amountWei) {
  if (!isAddress(recipient)) throw new Error('Invalid recipient');
  if (!/^[1-9]\d*$/.test(amountWei)) throw new Error('Positive integer wei required');
  const i = await identity(await keys());
  const p = policy(recipient, amountWei, toHex(randomBytes(32)));
  p.account = i.address;
  const context = contextFor(p);
  const signature = i.erc1271.signStatelessAction(context);
  if (!i.erc1271.verifyStatelessAction(context, signature)) throw new Error('Local signature verification failed');
```
- **What got in the way:** Quip has not deployed its account contracts on Aglais [[C-ACC-01](https://developers.quip.network/llms.txt#:~:text=chain%20ID%2020033%20%280x4e41%29)], and Quip's faucet funds only Aglais, not Base Sepolia [[C-ACC-03](https://developers.quip.network/llms.txt#:~:text=Dispenses%2010%20AGLS%2C%20rate%2Dlimited%20per%20destination)]. One rebuild found that even with funds, `deploy` would fail on the public RPC, because the SDK sends `eth_sendTransaction` [[C-ACC-06](https://cdn.jsdelivr.net/npm/@quip.network/ethereum-sdk@0.3.0-beta.8/dist/src/v1/shrincs/shrincsFactoryClient.d.ts)]. The builder relied on the SDK page's statement that no swap SDK is published and did not find `quip-swap-sdk` [[C-SWP-03](https://developers.quip.network/docs/getting-started/quip-sdk#:~:text=no%20swap%20SDK%20is%20published%20today)].

## Round 3

Explorer links below use three forms: Base Sepolia on Blockscout, Aglais EVM transactions on the Aglais Blockscout, and Aglais Substrate extrinsics on Subscan. Compute jobs are given as order ids, because the SDK does not return a transaction link [[C-TRL-22](https://github.com/QuipNetwork/xquad/blob/5239d71bfbd025a91f06d872ad7e98da4b5e4556/xqsa/quip.py#L1140-L1156)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
