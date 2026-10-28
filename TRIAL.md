# t07-a

- **Round:** Round 1
- **Model:** Claude Opus 5.5
- **Task:** Verify a PQ signature on-chain (Foundry)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Verify a PQ signature on-chain (Foundry) | Claude Opus 5.5 | hashsigs-solidity WOTSPlus (its own copy on Aglais) | Works on testnet, but on legacy WOTS+ with its own copy of the library | ~6 min | Never opened the developer docs. The SHRINCS Solidity verifier is only on unmerged branches, and no WOTSPlus address is published for Aglais [C-SDK-13, C-TRL-43, C-TRL-44]. Rebuilds differ: one confirmed; the other rated it partly working because the `lib/` dependencies were missing. |

## Trial card

- **Model:** Claude Opus 5.5.
- **What it does:** A Foundry contract wrapping Quip's `hashsigs-solidity` `WOTSPlus` library to verify WOTS+ signatures on-chain, with signatures produced off-chain by `@quip.network/hashsigs` 0.1.0, deployed and exercised on Aglais.
- **Quip products and integration:** `hashsigs-solidity` WOTSPlus — OUTDATED (WOTS+ scheme) / SELF_DEPLOYED (no WOTSPlus address is published for Aglais, so the builder deployed its own copy).
- **Evidence:** Builder's report: WOTSPlus library [0x40a1c0d43d9ca56018A5E2a01e765254301e2859](https://explorer.aglais.quip.network/address/0x40a1c0d43d9ca56018A5E2a01e765254301e2859) (deploy tx [0xa59e01e37d940229004aeb15770d8089533f6b9be81913fb300b7dead9b1f1b8](https://explorer.aglais.quip.network/tx/0xa59e01e37d940229004aeb15770d8089533f6b9be81913fb300b7dead9b1f1b8)), verifier [0x078D7D275F3A64349f72e6541b8fb38b7C6B7e4D](https://explorer.aglais.quip.network/address/0x078D7D275F3A64349f72e6541b8fb38b7C6B7e4D) (deploy tx [0x0a5a7548ad08b3c368a8d9c2f326b43919dd73dfabcbadf0f77129180153a26e](https://explorer.aglais.quip.network/tx/0x0a5a7548ad08b3c368a8d9c2f326b43919dd73dfabcbadf0f77129180153a26e)), a valid `verifyAndConsume` tx [0x8b180e74fa964017122b72dcfe16c42ac24371ba5c26c68cc1270b23c0da1ce8](https://explorer.aglais.quip.network/tx/0x8b180e74fa964017122b72dcfe16c42ac24371ba5c26c68cc1270b23c0da1ce8) (status 1) and a tampered one [0x2b96b4316dcd2ac59e6cdc4baea3df297495406f833bddd386cb1c997bbd1718](https://explorer.aglais.quip.network/tx/0x2b96b4316dcd2ac59e6cdc4baea3df297495406f833bddd386cb1c997bbd1718) (status 0). Both independent rebuilds re-checked the builder's valid tx and each deployed its own copy. One rebuild's verifier is `0xaCA965B77013661E41Ac97788E7922b0ecb22049`, with a valid consume (tx `0x9a2380b6…`) and a tampered consume that reverted on-chain (tx `0x80cf0c98…`). The other rebuild rated it partly working because the `lib/` dependencies were missing from the project and had to be installed by hand.
- **Key Quip call** (`src/QuipSignatureVerifier.sol:38-49`):
```solidity
function verifyAndConsume(
    bytes32 publicSeed,
    bytes32 publicKeyHash,
    bytes32 messageHash,
    bytes32[67] calldata signature
) external returns (bool) {
    if (usedPublicKey[publicKeyHash]) revert PublicKeyAlreadyUsed(publicKeyHash);
    if (!this.verify(publicSeed, publicKeyHash, messageHash, signature)) revert InvalidQuipSignature();
    usedPublicKey[publicKeyHash] = true;
    emit QuipSignatureVerified(publicKeyHash, publicSeed, messageHash, msg.sender);
    return true;
}
```
- **What got in the way:** It never opened developers.quip.network, so it did not see the Quip SDK page that calls WOTS+ previous-generation (the Quickstart, which it also skipped, still calls WOTS+ "preferred" [[C-SDK-06](https://developers.quip.network/docs/getting-started/quickstart#:~:text=the%20preferred%20Winternitz%20One-Time%20Signature)]); its notes and write-up never mention SHRINCS, and it built on WOTS+ from the GitHub sources. In the hashsigs-solidity repository the SHRINCS Solidity verifier source is only on unmerged branches (the deployed verifier's source is verified on the Base Sepolia Blockscout explorer). Quip's deployed ShrincsVerifier and WOTSPlus library have code on Base Sepolia and OP Sepolia but not on Aglais, and no WOTSPlus address is published for Aglais, so the builder deployed its own. The hashsigs-solidity and hashsigs-ts READMEs have no usage docs [[C-SDK-13](https://gitlab.com/quip.network/hashsigs-solidity/-/tree/e92d0b954b47f6c881bcf6736ee2bff64f84e77b/contracts), [C-TRL-43](https://github.com/QuipNetwork/hashsigs-solidity/blob/e92d0b954b47f6c881bcf6736ee2bff64f84e77b/contracts/WOTSPlus.sol#L102-L106), [C-TRL-44](https://github.com/QuipNetwork/hashsigs-solidity/blob/e92d0b954b47f6c881bcf6736ee2bff64f84e77b/README.md)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
