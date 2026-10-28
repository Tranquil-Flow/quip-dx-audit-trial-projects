# t07-b

- **Round:** Round 1
- **Model:** GLM-5.2
- **Task:** Verify a PQ signature on-chain (Foundry)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Verify a PQ signature on-chain (Foundry) | GLM-5.2 | hashsigs-solidity WOTSPlus (its own copy on Aglais) | Works on testnet, but on legacy WOTS+ | ~18 min | [C-SDK-06, C-SDK-13, C-TRL-43, C-TRL-44]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GLM-5.2.
- **What it does:** The same on-chain WOTS+ verification pattern, with an added one-time-key registry (`registerQuipKey`/`submitAttestation`) enforcing replay protection.
- **Quip products and integration:** `hashsigs-solidity` WOTSPlus — OUTDATED / SELF_DEPLOYED.
- **Evidence:** verifier address [0x32640c693aA5202CA030C4D714A521D54E5d1719](https://explorer.aglais.quip.network/address/0x32640c693aA5202CA030C4D714A521D54E5d1719), WOTSPlus library deploy tx [0x9194d5c5c470a340dfff0bf96af5a61c0713c3d2068c584bc040bc5f6aed0fd5](https://explorer.aglais.quip.network/tx/0x9194d5c5c470a340dfff0bf96af5a61c0713c3d2068c584bc040bc5f6aed0fd5), a live `submitAttestation` tx [0x826f2d45460b3d92178306c0801883b5b07d3d7a4737754872d486abeace1ace](https://explorer.aglais.quip.network/tx/0x826f2d45460b3d92178306c0801883b5b07d3d7a4737754872d486abeace1ace), all from the builder's report. One rebuild re-checked these on the live RPC but could not finish its own redeploy. The other deployed its own verifier at `0x469AecD61e5e64E85E5827bf2EB9f0e6480A482f`.
- **Key Quip call** (`src/QuipWOTSVerifier.sol:68-82`):
```solidity
function submitAttestation(bytes calldata message, bytes32[67] calldata signature) external {
    WOTSPlus.WinternitzAddress memory quipAddress = quipKeys[msg.sender];
    if (quipAddress.publicKeyHash == bytes32(0) && quipAddress.publicSeed == bytes32(0)) {
        revert NotRegistered();
    }
    if (keyConsumed[msg.sender]) revert KeyAlreadyUsed();

    uint256 gasBefore = gasleft();
    bool ok = verifySignature(quipAddress.publicSeed, quipAddress.publicKeyHash, message, signature);
    uint256 gasUsed = gasBefore - gasleft();

    if (!ok) {
        emit RejectedTamperedSignature(msg.sender, keccak256(message), message);
        revert InvalidSignature();
    }
```
- **What got in the way:** Like the other t07 trials, it built on WOTS+, the previous-generation scheme. It opened only the developer-portal index, not the Quickstart (which still calls WOTS+ "preferred" [[C-SDK-06](https://developers.quip.network/docs/getting-started/quickstart#:~:text=the%20preferred%20Winternitz%20One-Time%20Signature)]) or the Quip SDK page, and relied on Quip's GitHub source. The SHRINCS Solidity verifier source is only on unmerged branches, and Quip's WOTSPlus library has no code on Aglais and no published Aglais address, so the builder deployed its own copy [[C-SDK-13](https://gitlab.com/quip.network/hashsigs-solidity/-/tree/e92d0b954b47f6c881bcf6736ee2bff64f84e77b/contracts), [C-TRL-43](https://github.com/QuipNetwork/hashsigs-solidity/blob/e92d0b954b47f6c881bcf6736ee2bff64f84e77b/contracts/WOTSPlus.sol#L102-L106), [C-TRL-44](https://github.com/QuipNetwork/hashsigs-solidity/blob/e92d0b954b47f6c881bcf6736ee2bff64f84e77b/README.md)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
