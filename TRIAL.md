# t03-a

- **Round:** Round 1
- **Model:** Claude Opus 5.5
- **Task:** OTC swap via QuipSwap (happy path and refund)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| OTC swap via QuipSwap (happy path and refund) | Claude Opus 5.5 | Omnibus + ethereum-sdk (Accounts) | Partly working: both flows ran against Quip's real contracts on a local fork of Base Sepolia; no public-testnet transaction | ~12 min | "No swap SDK" sentence; no address or ABI in the docs; no Base Sepolia gas route [C-SWP-03, C-TRL-13, C-TRL-14, C-ACC-03]. Rebuilds differ (partial / works). |

## Trial card

- **Model:** Claude Opus 5.5.
- **What it does:** Scripts that run an OTC swap through QuipSwap's Omnibus hash-lock contract using Quip SHRINCS smart wallets on both sides: a happy path (ETH for an ERC-20) and a refund path where the counterparty never shows up.
- **Quip products and integration:** QuipSwap Omnibus + `ethereum-sdk` (Quip Accounts) — NATIVE contracts, exercised only on a local anvil fork of Base Sepolia (the builder found no Base Sepolia faucet that worked without a login or captcha, and the rebuilds did not bypass one either).
- **Evidence:** Local fork only — no public transactions. The Omnibus contract itself is real: [0xA7955981D5759a799267063110Be0F7AeCc26F8A](https://base-sepolia.blockscout.com/address/0xA7955981D5759a799267063110Be0F7AeCc26F8A) on Base Sepolia, confirmed live via `eth_call VERSION()` by both independent rebuilds (returns `QUIP:Omnibus:v1.0.0-beta.3`), and confirmed absent on Aglais.
- **Key Quip call** (`scripts/lib.mjs:80-87`):
```js
export function commitCall(lock, party, counterparty, walletAddress, vaultId) {
  // bundle fn tAe/eAe: auth = { signer: concat([vaultAddress, vaultId]), signature: "0x" }
  const value = party.assets.filter(a => a.assetType === ASSET.Native).reduce((s, a) => s + a.amount, 0n);
  return {
    target: OMNIBUS, value,
    data: encodeFunctionData({ abi: OMNIBUS_ABI, functionName: "commit", args: [lock, party, counterparty, { signer: concat([walletAddress, vaultId]), signature: "0x" }] }),
  };
}
```
- **What got in the way:** The Quip SDK page says no swap SDK is published, although `@quip.network/quip-swap-sdk` is on npm [[C-SWP-03](https://developers.quip.network/docs/getting-started/quip-sdk#:~:text=no%20swap%20SDK%20is%20published%20today)]; the QuipSwap page gives no contract address or ABI [[C-TRL-13](https://developers.quip.network/docs/quip-interlock-protocol/quipswap)]; and no docs page shows a path to a funded testnet swap between two Quip wallets [[C-TRL-14](https://developers.quip.network/docs/quip-interlock-protocol/quip-accounts#:~:text=A%20factory%20contract%20creates%20each%20account)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
