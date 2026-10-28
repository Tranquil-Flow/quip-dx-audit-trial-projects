# t03-c

- **Round:** Round 1
- **Model:** DeepSeek V4 Pro
- **Task:** OTC swap via QuipSwap (happy path and refund)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| OTC swap via QuipSwap (happy path and refund) | DeepSeek V4 Pro | Omnibus (read-only probes) | Partly working: read-only probes of a live Omnibus on Base Sepolia, with the ABI taken from a web-app bundle; no swap sent | ~20 min | Relied on the "no swap SDK" sentence and the old `latest` ethereum-sdk. It used an Omnibus address that differs from the SDK's, and no doc says which is current [C-SWP-03, C-SDK-10, C-TRL-13]. Both rebuilds rated it partly working. |

## Trial card

- **Model:** DeepSeek V4 Pro (MiniMax-M3 made only the first call).
- **What it does:** A read-only toolkit that extracts QuipSwap's full Omnibus contract ABI (66 entries) and the wallet and wallet-factory ABIs from Quip's minified web-app bundle (served at `quip-swap.quip.locker`), because the project found no public repo, npm package or explorer-verified source. (It checked Blockscout only; the Omnibus is in fact exact-match verified on Sourcify.) It then uses `eth_call` simulations and a Blockscout scan to reconstruct the commit/claim/reclaim state machine and gating rules. No swap was attempted: the project concluded that the SHRINCS wallet Omnibus requires as a caller could only be created with code inside that bundle, a conclusion that was wrong (see below).
- **Quip products and integration:** QuipSwap Omnibus — CHAIN_ONLY (a real, live Quip deployment, probed read-only with hand-extracted calls rather than any documented client; one rebuild called this component NATIVE but explicitly caveated it as "read-only diagnostic use, not a completed swap lifecycle," so the conservative label is used here).
- **Evidence:** Omnibus address [0xf780Fc9C066D824bFF85758E381A3919B1817f09](https://base-sepolia.blockscout.com/address/0xf780Fc9C066D824bFF85758E381A3919B1817f09) on Base Sepolia and WalletFactory [0x6de121f7cc8b310adbc957425b97e1c8dfce3be5](https://base-sepolia.blockscout.com/address/0x6de121f7cc8b310adbc957425b97e1c8dfce3be5), both confirmed live via `eth_getCode` by both independent rebuilds. This project sent no swap transaction, so there is none to link. One rebuild found that the Omnibus already had real Commitment and Claim events from 2026-07-23, which the project's own scan missed because it only looked at top-level transactions.
- **Key Quip call** (`scripts/probe-gate.js:5-10`):
```js
const RPC = "https://sepolia.base.org";
const OMNI = "0xf780Fc9C066D824bFF85758E381A3919B1817f09";
const FACTORY = "0x6de121f7cc8b310adbc957425b97e1c8dfce3be5";

const provider = new ethers.JsonRpcProvider(RPC);
const iface = new ethers.Interface(abi);
```
- **What got in the way:** The project looked only at the old `latest` ethereum-sdk (0.1.7, WOTS+) and concluded that the SHRINCS wallet stack gating Omnibus commits existed only inside the minified web bundle; it missed `ethereum-sdk@beta`, which ships a SHRINCS wallet client [[C-SDK-10](https://www.npmjs.com/package/@quip.network/ethereum-sdk?activeTab=versions)]. It also relied on the SDK page's statement that no swap SDK is published, so it never found `quip-swap-sdk` on npm [[C-SWP-03](https://developers.quip.network/docs/getting-started/quip-sdk#:~:text=no%20swap%20SDK%20is%20published%20today)]. A rebuild also found another Omnibus deployment on Base Sepolia at `0xA7955981D5759a799267063110Be0F7AeCc26F8A` (the one other QuipSwap trials used), with no doc saying which of the two is current [[C-TRL-13](https://developers.quip.network/docs/quip-interlock-protocol/quipswap)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
