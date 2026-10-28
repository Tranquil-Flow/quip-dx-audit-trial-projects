# RESULT — Quip post-quantum signature verification on Aglais testnet

Overall status: **WORKING**

A Quip SHRINCS post-quantum signature was generated with Quip's current
signing package, verified on-chain inside smart contracts deployed on Quip's
Aglais testnet (chain id 20033), using Quip's own Solidity verifier libraries
(deployed from their source, byte-identical to their published artifacts).

## Scheme decision

- Quip's currently recommended scheme is **SHRINCS** (hybrid: stateful WOTS-C
  under an unbalanced XMSS-style tree + stateless SPHINCS+C recovery path),
  delivered via `@quip.network/hashsigs-wasm@rc` and `@quip.network/ethereum-sdk@beta`
  (docs: developers.quip.network/docs/getting-started/quip-sdk).
- SHRINCS **does** have on-chain Solidity verifiers
  (gitlab.com/quip.network/hashsigs-solidity), so the older WOTS+ scheme was
  not needed. I did not use WOTS+ at all.
- Profile used: **shrincs-256s-keccak** (the wasm package's default profile;
  keccak-only, so no SHA-256 precompile dependency on pallet-revive).

## Important vendor-repo wrinkle (version skew)

- The public GitHub mirror of hashsigs-solidity and the GitLab `main` branch
  contain only the legacy WOTS+ contracts.
- The SHRINCS verifiers live on feature branches. The branch matching the
  current Rust crate / wasm package / live ethereum-sdk@beta (V1.0.1
  generation, "V4 verifier" 0xF2f9E6D6... deployed on Base/OP Sepolia since
  2026-08-27) is GitLab branch **`oak-03-and-06`** (merge of review/mr-26-fixes,
  verifier format `quip.shrincs-verifier.v4`).
- The `create-x-deployment` branch HEAD is the older format
  (`quip.shrincs-verifier.v1`, raw-hash verify). My first deploy from that
  branch returned 0xffffffff for a valid signature until I found and switched
  to the v4 branch. (Those v1 deployments were left on Aglais, unused.)

## Status per component

| Component | Status | Evidence |
|---|---|---|
| Aglais RPC + faucet | WORKING | chainId 0x4e41; faucet extrinsic 0x7526380b..., 10 AGLS |
| Build Quip verifier libs (forge 1.8.3, production profile) | WORKING | runtime codehash of SHRINCS256sKeccak matches their pinned value exactly |
| Deploy SHRINCS256sKeccak (v4) on Aglais | WORKING | 0x7C4eF58b16E0677931473A31ccC2fdd0c615aa3C, tx 0xe569a0b0...; VERSION_TAG=keccak256("quip.shrincs-verifier.v4") |
| Deploy SPHINCSPlusC256sKeccak (v4) | WORKING | 0xf7a8394824Dc3193BcAd5868a7c9Be29B204d80f, tx 0x1ff4fa6f... |
| Generate SHRINCS key + signatures (wasm 0.2.1-rc9) | WORKING | keys/shrincs-demo.json; local verify true/true |
| On-chain stateful verify (ERC-7913 `verify`) | WORKING | eth_call -> 0x024ad318 (success selector) |
| On-chain stateless verify (standalone SPHINCS+C verifier) | WORKING | eth_call -> 0x024ad318 (91,200-byte signature) |
| Negative tests on-chain | WORKING | tampered sig / msg / key / stateless sig -> 0xffffffff |
| Signature gate inside a deployed contract (state change) | WORKING | PqUnlock 0x11F1084F...; unlock tx 0x7cc0aae7...: unlocked false->true |
| Quip's own example consumer | WORKING | 0xb8C6656F...; isAuthorized -> true |
| SHRINCSVerifier.verifyStateless (delegation path) | BLOCKED on Aglais | pinned CreateX CREATE3 sibling (0xe52707C5...) has no code; CreateX isn't pre-deployed on this Substrate chain. Worked around with the standalone verifier. |

## How to run what I built

- `./verify-onchain.sh` — replays every read-only on-chain check (verifies
  both signatures, reads the demo contract state). Needs the local foundry in
  ./.foundry/bin (already installed) and network access to
  evm-rpc.aglais.quip.network:20049.
- Signer: `cd signer && MSG_HASH=<32B hash> node sign.mjs` (npm install
  @quip.network/hashsigs-wasm@rc first). Regenerates keys each run — treat the
  existing keys/shrincs-demo.json as consumed (leaf 1 used).
- Contracts: `hashsigs-solidity-gitlab/` (Quip's repo, oak-03-and-06 branch)
  and `demo/` (my PqUnlock consumer + Quip's ERC-7913 interface).
- Deploy procedure used: `forge create --legacy --broadcast` against
  $RPC (plain CREATE; Quip's CreateX-based deploy scripts cannot run on
  Aglais because the CreateX singleton does not exist there).

## Evidence highlights

- Deploy SHRINCS256sKeccak v4: tx 0xe569a0b0b4cc8b345bdc24611419d1c30ed0f484531a245bc66a0788a6d01442
- Deploy SPHINCSPlusC256sKeccak v4: tx 0x1ff4fa6fde76d746e915e84828510d0fad24bbc3c7e322a0fa3c903163911dfc
- PqUnlock deploy: 0x11F1084FceD758F4567DE5DD105035bCB9DAbb6f (tx 0xd75a7b1c...)
- Quip example deploy: 0xb8C6656FA26D2F16E6e6Fb2db7EAb504212B1700 (tx 0x8e16b22a...)
- unlock (valid SHRINCS sig, state change): tx 0x7cc0aae7a3b104429b1d62f6be7da072428efc4143a7beea2c87a154d627519e, status 1, gasUsed 17,707,496
- unlock (tampered sig): tx 0x614b33c7dce61ccdf4dcd6e3cac7a3d427ff8a2331e22686e5d82e20dea7e128, status 0 (reverted), gasUsed 2,098,752
- Commitment 0xe3465ccd...43d0, message 0x728df4be...721b =
  keccak256("quip-aglais-demo|unlock|v1"); stateful sig 2,784 B (leaf 1);
  stateless sig 91,200 B. All txs indexed on explorer.aglais.quip.network.
- Cross-check vs production: the same signature also returns 0x024ad318 on
  Quip's LIVE V4 verifier on OP Sepolia (0xF2f9E6D692da41b089c3c261c41509669eEc5567,
  whose runtime code hashes to the vendor's published pin 0xe9319929...).
  My Aglais deployment was built from the same branch at a later commit
  (runtime code differs only by post-deploy fixes; verify() semantics match).
- Full record: DEVLOG.md; machine-readable: keys/deployments.json.

## What did not work / caveats

1. SHRINCSVerifier.verifyStateless (the delegated stateless path on the
   SHRINCS verifier) reverts on Aglais: it pins a CreateX CREATE3 sibling
   address that cannot exist on this chain. Demonstrated the stateless scheme
   through the standalone SPHINCSPlusC256sKeccak verifier instead.
2. Quip's deploy scripts (Deploy*.s.sol) hard-require the CreateX singleton
   (0xba5Ed099...), absent on Aglais; deployed the same artifacts with plain
   CREATE. On-chain code is identical (runtime codehash matches Quip's pinned
   values); only deterministic addresses are lost.
3. Version skew between public branches and the current npm packages cost
   significant time (see DEVLOG errors #4). pallet-revive revert reasons in
   receipts are empty strings, which made failure triage harder.
4. verifyAndAttest (EIP-1153 TSTORE) was not exercised — not needed for the
   demo; transient-storage support on pallet-revive is unverified.

## What would have made this easier (vendor docs/tools)

1. Publish the current SHRINCS Solidity verifiers on the public GitHub repo
   (github.com/QuipNetwork/hashsigs-solidity shows only legacy WOTS+; the
   live work is scattered across GitLab feature branches). A "current
   recommended branch/tag + matching npm version" table in DEPLOYMENTS.md or
   the docs would have saved the version-skew detour.
2. Document the ERC-7913 adapter message binding (keccak(op_tag, hash suite,
   commitment, hash)) and the v1->v4 format history in one place.
3. Ship a small end-to-end example: wasm sign -> ABI-encode -> cast call
   verify. Every piece exists but the wiring took source-diving in three repos.
4. Note explicitly that the deploy scripts require CreateX (not present on
   Aglais/pallet-revive) and offer a plain-CREATE fallback for such chains.
5. A README on the npm package @quip.network/hashsigs-wasm (only the source
   repo ts/ has docs) and a changelog linking npm versions to Solidity
   verifier format versions.
