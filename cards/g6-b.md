# g6-b

- **Round:** Round 3
- **Model:** DeepSeek V4 Pro
- **Task:** PQ signature verified in a contract on Aglais
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| PQ signature verified in a contract on Aglais | DeepSeek V4 Pro | hashsigs-wasm; self-deployed v4 verifiers | Built and working on testnet | 31 min | [C-R5-15, C-R5-16, C-SDK-24, C-TRL-05]. Rebuilds differ: both confirmed the signature check, and one rejected the write-up's claim that the verifier matches Quip's pinned codehash. |

## Trial card

- **Model:** DeepSeek V4 Pro (all model calls).
- **What it does:** A Node signer makes a SHRINCS 256s-keccak key with `hashsigs-wasm` and produces both a stateful and a stateless SPHINCS+C signature. The builder deployed v4 SHRINCS256sKeccak and SPHINCSPlusC256sKeccak verifiers and Quip's example consumer on Aglais, plus a `PqUnlock` contract that flips a flag only when the SHRINCS verifier accepts. A script re-runs the read-only checks.
- **Quip products and integration:** `hashsigs-wasm` signing — NATIVE; the verifiers, the example consumer and `PqUnlock` — SELF_DEPLOYED on Aglais (built from Quip's `oak-03-and-06` branch); Aglais EVM — CHAIN_ONLY.
- **Evidence:** SHRINCS verifier deploy [0xe569a0b0b4cc8b345bdc24611419d1c30ed0f484531a245bc66a0788a6d01442](https://explorer.aglais.quip.network/tx/0xe569a0b0b4cc8b345bdc24611419d1c30ed0f484531a245bc66a0788a6d01442) creating [0x7C4eF58b16E0677931473A31ccC2fdd0c615aa3C](https://explorer.aglais.quip.network/address/0x7C4eF58b16E0677931473A31ccC2fdd0c615aa3C); `PqUnlock` [0x11F1084FceD758F4567DE5DD105035bCB9DAbb6f](https://explorer.aglais.quip.network/address/0x11F1084FceD758F4567DE5DD105035bCB9DAbb6f); valid unlock [0x7cc0aae7a3b104429b1d62f6be7da072428efc4143a7beea2c87a154d627519e](https://explorer.aglais.quip.network/tx/0x7cc0aae7a3b104429b1d62f6be7da072428efc4143a7beea2c87a154d627519e) (status 1) and tampered unlock [0x614b33c7dce61ccdf4dcd6e3cac7a3d427ff8a2331e22686e5d82e20dea7e128](https://explorer.aglais.quip.network/tx/0x614b33c7dce61ccdf4dcd6e3cac7a3d427ff8a2331e22686e5d82e20dea7e128) (status 0). Overclaim: the builder's write-up says the deployed verifier matches Quip's pinned runtime codehash and is "byte-identical"; it does not (3362 bytes against the pinned 4581). First rebuild: works, with its own valid unlock [0x6c1dda49a69150d421117488ffa637e449372eb0728ac63e7e70e00c6cff9cbd](https://explorer.aglais.quip.network/tx/0x6c1dda49a69150d421117488ffa637e449372eb0728ac63e7e70e00c6cff9cbd). Second rebuild: partly working; it confirmed the core signature check but rejected the codehash claim.
- **Time:** 31 min.
- **What got in the way:** Several verifier branches use incompatible signature formats, `main` has none, and nothing maps them to library versions [[C-R5-15](https://gitlab.com/quip.network/hashsigs-solidity/-/blob/oak-03-and-06/contracts/SHRINCSVerifier.sol)]. There is no canonical SHRINCS verifier on Aglais and Quip's deploy scripts cannot run there [[C-R5-16](https://gitlab.com/quip.network/hashsigs-solidity/-/blob/oak-03-and-06/contracts/SHRINCS256sKeccak.sol)]. The `foundry.toml` fails on forge 1.5.1 [[C-SDK-24](https://gitlab.com/quip.network/hashsigs-solidity/-/blob/0e89278f573a29f8341e1f5697ea73e0f8988d51/foundry.toml#L32-L40)]. The verifiers are not on `main` [[C-SDK-13](https://gitlab.com/quip.network/hashsigs-solidity/-/tree/e92d0b954b47f6c881bcf6736ee2bff64f84e77b/contracts)]. The `hashsigs-wasm` npm page has no README [[C-TRL-01](https://cdn.jsdelivr.net/npm/@quip.network/hashsigs-wasm@0.1.0-rc1/README.md)], and there is no wasm-sign to on-chain-verify example [[C-TRL-05](https://data.jsdelivr.com/v1/packages/npm/@quip.network/hashsigs-wasm@0.2.1-rc9)]. Reverted Aglais transactions carry no revert reason [[C-TRL-30](https://explorer.aglais.quip.network/tx/0x9347459212a9432002a11ea44bd7561ba156a51e7512f82b1304f8d6465464f4)].
