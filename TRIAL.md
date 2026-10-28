# t07-c

- **Round:** Round 1
- **Model:** MiniMax-M3
- **Task:** Verify a PQ signature on-chain (Foundry)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Verify a PQ signature on-chain (Foundry) | MiniMax-M3 | hashsigs-solidity WOTSPlus (its own copy on Aglais) | Works on testnet, but on legacy WOTS+; its on-chain check was a read-only call | ~9 min | [C-SDK-13, C-TRL-43, C-TRL-44]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** MiniMax-M3.
- **What it does:** A Foundry WOTS+ verifier tested against Quip's own upstream test vectors, plus a fresh off-chain-generated signature checked both locally and on-chain.
- **Quip products and integration:** `hashsigs-solidity` WOTSPlus — OUTDATED / SELF_DEPLOYED.
- **Evidence:** The builder did not write a final report; its evidence is in its last message. WOTSPlus library [0x7dEF4e6Fa73E23114F94242b841Cad91708556F7](https://explorer.aglais.quip.network/address/0x7dEF4e6Fa73E23114F94242b841Cad91708556F7) (deploy tx [0x0c8af72a10e14e72b708679722cc861aff61e9b68feab50821cb3b82808fc8ee](https://explorer.aglais.quip.network/tx/0x0c8af72a10e14e72b708679722cc861aff61e9b68feab50821cb3b82808fc8ee)), verifier [0x421eABeFE1ee491F3d0Aa7E6cE3B26a5d789727A](https://explorer.aglais.quip.network/address/0x421eABeFE1ee491F3d0Aa7E6cE3B26a5d789727A) (deploy tx [0x6558d3b3301d3cf0e58037916036e1273bd7ec30aa577965f8bd1092df7e998b](https://explorer.aglais.quip.network/tx/0x6558d3b3301d3cf0e58037916036e1273bd7ec30aa577965f8bd1092df7e998b)). Its on-chain check was a read-only `cast call` that returned true, so there is no verify transaction. One rebuild re-checked these deployments and the `cast call`. Both independent rebuilds deployed their own copies. The other rebuild also sent a `verifyAndLog` tx (`0xec2eac97…`, status 1) to its verifier `0x8ddA0E4a7B3373bA7481b90B3A694240F8CEc554`.
- **Key Quip call** (`src/QuipSigVerifier.sol:51-58`):
```solidity
function verifyAndLog(
    WOTSPlus.WinternitzAddress calldata pubKey,
    bytes32 messageHash,
    bytes32[67] calldata signature
) external returns (bool ok) {
    ok = this.verify(pubKey, messageHash, signature);
    emit SignatureVerified(pubKey.publicSeed, pubKey.publicKeyHash, messageHash, ok);
}
```
- **What got in the way:** Same legacy-scheme gap as the rest of t07: in the hashsigs-solidity repo the SHRINCS Solidity verifier source is only on unmerged branches, and no WOTSPlus address is published for Aglais [[C-SDK-13](https://gitlab.com/quip.network/hashsigs-solidity/-/tree/e92d0b954b47f6c881bcf6736ee2bff64f84e77b/contracts), [C-TRL-43](https://github.com/QuipNetwork/hashsigs-solidity/blob/e92d0b954b47f6c881bcf6736ee2bff64f84e77b/contracts/WOTSPlus.sol#L102-L106), [C-TRL-44](https://github.com/QuipNetwork/hashsigs-solidity/blob/e92d0b954b47f6c881bcf6736ee2bff64f84e77b/README.md)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
