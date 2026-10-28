# t02-b

- **Round:** Round 1
- **Model:** GLM-5.2 (research), then DeepSeek V4 Pro (wrote and ran the code)
- **Task:** Create, fund and withdraw from a Quip PQ account
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Create, fund and withdraw from a Quip PQ account | GLM-5.2 (research), then DeepSeek V4 Pro (wrote and ran the code) | quip-signer (Aglais's native sr25519 + FN-DSA-512 hybrid account) | Partly working: account created, funded and withdrawn from natively on Aglais, but the withdrawal's recipient address is derived wrongly | ~55 min | The docs mention `quip-signer` only as a compute dependency, not as a way to create an account. Rebuilds differ: one confirmed the flow; the other found the recipient-address bug, and our own re-run confirmed it. |

## Trial card

- **Model:** GLM-5.2 did the early research (53 model calls); DeepSeek V4 Pro wrote the CLI and ran keygen, funding and the withdrawal (43 calls).
- **What it does:** A Python CLI that derives a Quip post-quantum account directly from Aglais's own chain-native H4 hybrid signature scheme (sr25519 + FN-DSA-512, via the vendor's `quip-signer` PyPI package) — a different code path from the SHRINCS EVM smart-wallet product most other Accounts trials used. It funds the account from the faucet, then hand-builds and signs a SCALE-encoded `Balances.transfer_allow_death` extrinsic to withdraw part of the balance to a separate "normal" address, submitting via `author_submitExtrinsic` and printing both extrinsic hashes for lookup. The PQ account, funding and signed withdrawal work, but the "normal" recipient address is derived wrongly, so the generated recipient key does not control the withdrawn funds (see below). One rebuild confirmed the run; the other rated it partly working for this reason.
- **Quip products and integration:** `quip-signer` / `quip-transaction-crypto` (Aglais's native H4 hybrid account/signature scheme) — NATIVE. No contract deployment of any kind is involved.
- **Evidence:** Builder's report: faucet mint extrinsic [0x0c172671b4d1473b0f430d563f299547684890b282b974952ccf64878cffca2a](https://subscan.aglais.quip.network/sub/extrinsic/0x0c172671b4d1473b0f430d563f299547684890b282b974952ccf64878cffca2a) (block 378976) and withdrawal extrinsic [0x706b34599282e8eddfb440f75ce2f7d727d101e3950be6b7c526812375dd77bc](https://subscan.aglais.quip.network/sub/extrinsic/0x706b34599282e8eddfb440f75ce2f7d727d101e3950be6b7c526812375dd77bc) (block 378984). Both independent rebuilds re-hashed the raw extrinsics from those blocks and matched them. Each rebuild also ran the CLI with fresh keys: one rebuild produced faucet extrinsic [0x4a0e3191389d298ab5d60a70640bdaf1354f5e449c132203993b6c2081ad644e](https://subscan.aglais.quip.network/sub/extrinsic/0x4a0e3191389d298ab5d60a70640bdaf1354f5e449c132203993b6c2081ad644e) (block 388240) and withdrawal [0x9802ce5bd2717e2233d6b7b3f39ca6a1ad20c397d3e2c0816b38b8ab411cca8a](https://subscan.aglais.quip.network/sub/extrinsic/0x9802ce5bd2717e2233d6b7b3f39ca6a1ad20c397d3e2c0816b38b8ab411cca8a) (block 388242). Our own re-run (2026-09-29) produced its own withdrawal in block 389296.
- **Key Quip call** (`quip_poc/quip_poc.py:213-222`):
```python
def build_signed_extrinsic(seed, acct32, call: bytes, nonce: int,
                           spec_version: int, tx_version: int) -> bytes:
    extra = b"\x00" + compact(nonce) + compact(0) + b"\x00"   # era immortal, tip 0
    additional = (spec_version.to_bytes(4, "little")
                  + tx_version.to_bytes(4, "little")
                  + GENESIS + GENESIS + b"\x00")
    payload = call + extra + additional
    if len(payload) > 256:  # Substrate SignedPayload rule
        payload = hashlib.blake2b(payload, digest_size=32).digest()
    envelope = sign_payload_from_seed(seed, payload)  # 1660 bytes
```
- **What got in the way:** The "normal address" it withdraws to is derived with `keccak256(0x04 || X || Y)` instead of the standard Ethereum `keccak256(X || Y)`. So the address shown and funded is not the one the generated secp256k1 key controls, and that key cannot spend the withdrawn funds. One rebuild caught this bug and the other missed it; our own re-run (2026-09-29) confirmed it by computing both addresses for the same key.

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
