# v6-e

- **Round:** Round 5
- **Model:** MiniMax-M3
- **Task:** QVRF randomness from a contract (screenshot-only)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| QVRF randomness from a contract (screenshot-only) | MiniMax-M3 | Aglais EVM and faucet (plain EVM); QVRF unreachable | Partly working: a request-and-callback loot-drop contract on Aglais with a labelled stand-in whose "randomness" is a SHA-256 hash, neither quantum nor verifiable; QVRF unusable (no request interface or testnet address) | 120 min | [C-TRL-47, C-TRL-48, C-TRL-49, C-TRL-50, C-R6-02, C-PER-04, C-TRL-30]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** MiniMax-M3.
- **What it does:** A Chainlink-VRF-shaped consumer contract (`LootDropV2`: `openLoot`, `rawFulfillRandomness`, `revealLoot`) deployed to Aglais, plus a Python and `cast` script that deploys it, opens a request, fulfils it with off-chain SHA-256 "QVRF-style" randomness and reveals the item. It is a stand-in, because no QVRF request interface exists on the testnet, and the README and write-up say so.
- **Quip products and integration:** Aglais EVM RPC and faucet — CHAIN_ONLY; QVRF — FALLBACK (the "randomness" is SHA-256 of an Aglais block hash, the request id and a public nonce, posted by the same wallet that made the request, so it is neither quantum nor verifiable; the JSON it writes has `samples`, `audited` and `xeb_score` all 0); the QVRF docs and marketing pages — read only.
- **Evidence:** `LootDropV2` deploy [0x7e0fd8cc742c0ae59a4f5b9d0e535327e9865dfd1c142a6f6f199bcb04f4f927](https://explorer.aglais.quip.network/tx/0x7e0fd8cc742c0ae59a4f5b9d0e535327e9865dfd1c142a6f6f199bcb04f4f927) (351,792,017 gas), `openLoot` [0x23d33bbcd7957241b4d6885815ebcea74ac49ada71f2cbff04ea63a13c0f14d1](https://explorer.aglais.quip.network/tx/0x23d33bbcd7957241b4d6885815ebcea74ac49ada71f2cbff04ea63a13c0f14d1), `rawFulfillRandomness` [0xf68902766b262053968f00636d5ff259af4db4bbcc25a3831f30bb6cecceea6b](https://explorer.aglais.quip.network/tx/0xf68902766b262053968f00636d5ff259af4db4bbcc25a3831f30bb6cecceea6b) and `revealLoot` [0x6de55698065704e69a4344379f9e15ff9226776c86a938bf39dccbe01be3eb00](https://explorer.aglais.quip.network/tx/0x6de55698065704e69a4344379f9e15ff9226776c86a938bf39dccbe01be3eb00), all status 1. First rebuild: works (a new key, a new deploy [0x6f7a5a8dece8ccd9917da6a37410b668146801fe1d71796ebb7f80091dc8695c](https://explorer.aglais.quip.network/tx/0x6f7a5a8dece8ccd9917da6a37410b668146801fe1d71796ebb7f80091dc8695c) and a full open, fulfil and reveal cycle; the script hard-codes the Foundry binary paths of the builder's machine). Second rebuild: works (deploy, open, fulfil and reveal reproduced with a fresh key). The write-up has several misreadings: it calls the 10 AGLS balance "pre-existing funds from genesis" when it was the faucet's drip, it swaps two factory addresses in one friction note, and it explains the genesis-hash mismatch as a chain reset when the two hashes belong to different layers [[C-PER-04](https://developers.quip.network/llms.txt#:~:text=Identify%20the%20chain%20by%20THIS)]. Its report that `estimateGas` reverts for deploys with constructor arguments did not reproduce; the real cost is the very high gas (about 352M for a 2.4 KB contract).
- **Time:** 120 min.
- **Key Quip call** (`scripts/loot_drop_demo.py:191, 202, 206-209`, excerpt):
```python
open_rcpt = cast_send(pk, contract_addr, "openLoot()", value=LOOT_PRICE_WEI)
...
rand, transcript = compute_qvrf_style_randomness(w3, request_id, acct.address)
...
fulfill_rcpt = cast_send(
    pk, contract_addr, "rawFulfillRandomness(uint256,uint256)",
    str(request_id), f"0x{rand:064x}",
)
```
- **What got in the way:** The QVRF page says it "covers concepts only", lists no function names or contract address, and the marketing page presents a finished transcript format [[C-TRL-47](https://developers.quip.network/docs/compute/qvrf#:~:text=The%20request%20interface%20is%20not%20yet%20final%2C%20so%20no%20function%20names%20or%20parameters%20appear%20here), [C-TRL-48](https://quip.network/qvrf/#:~:text=You%20can%20check%20it%20without%20trusting%20us), [C-TRL-49](https://registry.npmjs.org/-/v1/search?text=qvrf), [C-TRL-50](https://developers.quip.network/docs/compute/qvrf#:~:text=QVRF%20coordinator), [C-R6-02](https://developers.quip.network/docs/compute/qvrf#:~:text=The%20request%20interface%20is%20not%20yet%20final%2C%20so%20no%20function%20names%20or%20parameters%20appear%20here)]. `llms.txt` says to identify the chain by the Substrate genesis hash, but the EVM RPC's block 0 has a different hash and the page does not say which layer the hash belongs to [[C-PER-04](https://developers.quip.network/llms.txt#:~:text=Identify%20the%20chain%20by%20THIS)]. The public SDK repository is not configured for Aglais and Quip's factories are not deployed there, so no Quip contract can be reused [[C-ACC-01](https://developers.quip.network/llms.txt#:~:text=chain%20ID%2020033%20%280x4e41%29), [C-ACC-02](https://cdn.jsdelivr.net/npm/@quip.network/ethereum-sdk@0.3.0-beta.8/dist/src/v1/addresses.js)]. A deploy on Aglais costs about 350M gas for a 2.4 KB contract [[C-TRL-30](https://explorer.aglais.quip.network/tx/0x9347459212a9432002a11ea44bd7561ba156a51e7512f82b1304f8d6465464f4), [C-NET-01](https://developers.quip.network/llms.txt#:~:text=gas%20price%201%20gwei%2C%20backend%20pallet-revive)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. `RESTORED.md` lists the files taken from the session log because the snapshot predates their last change. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
