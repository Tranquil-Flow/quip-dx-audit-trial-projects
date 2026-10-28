# DEVLOG — Quip post-quantum signature verification on Aglais testnet

Task: verify a Quip post-quantum signature inside a smart contract deployed on
Quip's Aglais testnet (chain id 20033), using Quip's Solidity verifier
libraries. Prefer the scheme Quip currently recommends; if only an older
scheme has an on-chain verifier, use it and say so.

## Sources consulted (in order)

1. https://quip.network/ — main site. Learned: Postquant Labs, asset layer
   with hash-based post-quantum signatures (WOTS+ mentioned), GitHub org
   github.com/quipnetwork.
2. https://agls.quip.network/ — Aglais testnet portal. Chain id 20033
   (0x4e41), EVM JSON-RPC https://evm-rpc.aglais.quip.network:20049,
   pallet-revive backend, faucet https://faucet.aglais.quip.network/request
   (curl POST {"dest": "<address>"}), explorer.aglais.quip.network, gas price
   1 gwei, AGLS 18 decimals on the EVM side.
3. https://quip.network/blog/testnet-is-live — testnet launch post; "Quip
   Network uses hash-based signatures (WOTS+)".
4. https://developers.quip.network/docs — docs index. Licensing AGPL-3.0.
5. https://developers.quip.network/docs/getting-started/quip-sdk — KEY PAGE.
   Current generation: SHRINCS via `@quip.network/ethereum-sdk@beta` and
   `@quip.network/hashsigs-wasm@rc`. Previous generation: WOTS+
   (`@quip.network/hashsigs`, `@quip.network/hashsigs-solidity`, hashsigs-cpp,
   hashsigs-rs crate). "New integrations should use the packages in the tables
   above" -> SHRINCS is the currently recommended scheme.
6. https://developers.quip.network/docs/quip-interlock-protocol/quip-accounts —
   SHRINCS construction overview: stateful everyday path (WOTS-C under
   unbalanced XMSS-style tree, RFC 8391 baseline) + stateless break-glass path
   (SPHINCS+C, FIPS 205 conventions); ERC-1271 + ERC-7913 interfaces.
7. https://github.com/QuipNetwork — org repos list. Key: hashsigs-solidity
   (Solidity contracts), hashsigs-rs (Rust reference), hashsigs-ts (legacy
   WOTS+ TS), ethereum-sdk.
8. Cloned locally (git, --depth 1):
   - github.com/QuipNetwork/hashsigs-solidity  (main = WOTS+ only, legacy)
   - github.com/QuipNetwork/hashsigs-ts        (legacy WOTS+ TS)
   - github.com/QuipNetwork/ethereum-sdk       (main = v1 WOTS+ QuipWallet/Factory, old generation)
   - github.com/QuipNetwork/hashsigs-rs        (current SHRINCS reference signer/verifier in Rust; README says it anchors the Solidity verifier)
   - gitlab.com/quip.network/hashsigs-solidity (main = WOTS+ only; branch
     `create-x-deployment` = CURRENT-generation SHRINCS Solidity verifiers)
9. https://github.com/QuipNetwork/hashsigs-solidity — README (WOTS+ only).
10. https://gitlab.com/quip.network/hashsigs-solidity branch
    create-x-deployment — README, DEPLOYMENTS.md, contracts/SHRINCSVerifier.sol,
    SHRINCS256sKeccak.sol, examples/. This IS the current on-chain verifier
    library. SHRINCS is "testnet-only" per DEPLOYMENTS.md; no chain has a
    deployment yet.
11. https://www.npmjs.com/package/@quip.network/hashsigs-wasm — npm package
    page (0.1.0-rc1, repo = hashsigs-rs).
12. hashsigs-rs/docs/solidity-parity.md — Rust<->Solidity parity record.
13. hashsigs-rs/ts/README.md — wasm package API (the npm package has no
    README; this is the source repo's docs).

## Scheme decision

- Currently recommended: SHRINCS (hybrid stateful WOTS-C/UXMSS + stateless
  SPHINCS+C recovery), profile default 256s-keccak.
- It HAS an on-chain Solidity verifier (hashsigs-solidity
  create-x-deployment branch: SHRINCS256sKeccak, SPHINCSPlusC256sKeccak,
  SHRINCSVerifier base, ERC-7913 interface). So no need to fall back to the
  older WOTS+ scheme.
- Chosen profile: SHRINCS256sKeccak (default profile of the wasm package,
  keccak-only so no SHA-256 precompile needed — important on pallet-revive).

## Deviations / guesses

- Quip's deploy scripts require the CreateX singleton (0xba5Ed0...9a5Ed),
  which does not exist on Aglais (Substrate/pallet-revive chain). GUESS:
  deploy the same contracts directly with `forge create` (plain CREATE) —
  the on-chain verifier logic is identical; only the deterministic address
  is lost, and the pinned SPHINCSPlusC sibling constant inside
  SHRINCS256sKeccak points at the CreateX CREATE3 address which will have no
  code on Aglais. Stateful `verify` does not use the sibling, so it works;
  `verifyStateless` would revert. Mitigation: also deploy the standalone
  SPHINCSPlusC256sKeccak verifier and demonstrate the stateless path against
  it directly.
- pallet-revive specifics unknown: contract size limit, storage deposits,
  supported tx types. Will test empirically.
- The npm package has no README; API taken from hashsigs-rs/ts/ source.

## Commands / actions

### Toolchain (checked)
- forge 1.5.1-stable, cast 1.5.1, node v22.22.2, npm — all present.
- git clones of the five repos above.

### Build
(fill in as done)

## Errors / dead ends

1. foundry.toml of hashsigs-solidity needs foundry >= 1.7.1 ("Unknown variant
   transfer-deprecated" on foundry 1.5.1). Installed foundry 1.8.3 locally
   into ./.foundry via FOUNDRY_DIR (avoided touching the shared ~/.foundry
   which has an anvil fork running from another session).
2. foundryup first said "up to date" despite 1.5.1 vs 1.8.3 latest; local
   install with -i v1.8.3 worked.
3. Node createHash("keccak256") unsupported -> used `cast keccak` for the
   demo message hash.
4. First on-chain verify attempt (with the v1 verifier from
   create-x-deployment HEAD) returned 0xffffffff: VERSION SKEW. The
   create-x-deployment branch HEAD (d2c739e) implements verifier format
   "quip.shrincs-verifier.v1" (raw-hash verify), while the current Rust
   crate (hashsigs-rs HEAD, source of @quip.network/hashsigs-wasm 0.2.1-rc9)
   implements "quip.shrincs-verifier.v4" (verify binds the hash to
   keccak(OP_VERIFY_STATEFUL || HASH_SUITE_ID || commitment || hash)).
   Resolution: found the v4 Solidity branch = GitLab branch `oak-03-and-06`
   (merge of review/mr-26-fixes). Confirmed against the live
   @quip.network/ethereum-sdk@beta (0.3.0-beta.8): its V1.0.1 generation
   pins the "V4 verifier" 0xF2f9E6D692da41b089c3c261c41509669eEc5567
   (hashsigs-solidity MR !26: "raw signatures bound to the full public-key
   commitment"), chain-independent CreateX address, live on Base Sepolia /
   OP Sepolia since 2026-08-27. So the CURRENT recommended scheme+verifier =
   SHRINCS v4 (oak-03-and-06). The v1 contracts I deployed first are left on
   Aglais as dead artifacts (keep for the record).
5. hand-rolled ABI encoding of the eth_call reverted; switched to cast call.

## Deployments so far (Aglais, chain 20033)

- EOA (throwaway): 0x2c1dF9dCB1F4fc71089c45F09242642a4cc9D882
  (key in keys/aglais-eoa.json). Funded by faucet: 10 AGLS,
  faucet extrinsic 0x7526380b14b766fc567b8c0910a78334ac5d5940ac76dab628fa1b5522847ee4.
- SHRINCS256sKeccak (v1 format, create-x-deployment branch) deployed at
  0x13037927AC0b76B3EC599E53bbC61Ce9fAa8F179, tx 0x6397b42ed5ef7e8f91b9106b4068d29ba819e458751bc1d68d0217bc4964ddd6.
  PROFILE_TAG()=0x32f573b4... (=keccak256("shrincs-256s-keccak")),
  VERSION_TAG()=0x064b5b1b... (=keccak256("quip.shrincs-verifier.v1")).
  This is the OLD format; kept only as a record, not used for the demo.
- SPHINCSPlusC256sKeccak (v1) at 0x19A1ADbFac22d120b8f9a0b5DaF0e6DFf431c405,
  tx 0xf35073a7ebb55eca108aa090d41a09c65b37ad946d1c8e30254b06a93af64551.
- SHRINCS demo key (wasm, throwaway): seed/secret/signatures in
  keys/shrincs-demo.json; commitment
  e3465ccdf88d845708d4004dc6af0e2670ac6cfe55b4b3ddc023a074af5b43d0;
  message hash 728df4be...721b = keccak256("quip-aglais-demo|unlock|v1");
  stateful sig (leaf 1) 2784 bytes; stateless sig 91200 bytes.
  Local verify: stateful true, stateless true.


## Evidence to collect
- Deploy tx hashes + addresses of verifier contracts and demo consumer. -> keys/deployments.json
- Faucet request outputs. -> extrinsic above.
- eth_call results (valid signature -> 0x024ad318, tampered -> 0xffffffff).
- State-changing tx where a contract gated by SHRINCS verify flips a flag.
- wasm-side: keygen seed, commitment, signature bytes (stored in ./keys/,
  testnet-only throwaway).

## Final evidence (all on Aglais, chain 20033)

V4 verifier pair (oak-03-and-06 = MR !26, current format):
- SPHINCSPlusC256sKeccak 0xf7a8394824Dc3193BcAd5868a7c9Be29B204d80f
  (tx 0x1ff4fa6fde76d746e915e84828510d0fad24bbc3c7e322a0fa3c903163911dfc)
- SHRINCS256sKeccak 0x7C4eF58b16E0677931473A31ccC2fdd0c615aa3C
  (tx 0xe569a0b0b4cc8b345bdc24611419d1c30ed0f484531a245bc66a0788a6d01442)
  VERSION_TAG() = 0xb84d51f9... = keccak256("quip.shrincs-verifier.v4")
  PROFILE_TAG() = 0x32f573b4... = keccak256("shrincs-256s-keccak")

Consumers:
- PqUnlock (my state-changing demo, demo/src/PqUnlock.sol)
  0x11F1084FceD758F4567DE5DD105035bCB9DAbb6f
  (tx 0xd75a7b1c2c89550818801ca9cedefc8a38e82c8d0d88108f420a8de87ee52e78)
- Quip's unmodified SHRINCSERC7913ConsumerExample
  0xb8C6656FA26D2F16E6e6Fb2db7EAb504212B1700
  (tx 0x8e16b22a0d8a802321cc84a2eccfc97745952aeba5f8874f3a501cc7845402b9)

Signature (wasm @quip.network/hashsigs-wasm 0.2.1-rc9, profile shrincs-256s-keccak):
- commitment e3465ccd...5b43d0, message 728df4be...721b =
  keccak256("quip-aglais-demo|unlock|v1")
- stateful sig (leaf 1) 2784 B; stateless sig 91200 B
- local wasm verify: stateful true, stateless true

On-chain results:
- stateful verify (eth_call, SHRINCS256sKeccak V4): 0x024ad318 (VALID)
- stateless verify (eth_call, standalone SPHINCSPlusC256sKeccak V4):
  0x024ad318 (VALID)
- tampered stateful sig: 0xffffffff; tampered message: 0xffffffff;
  wrong commitment: 0xffffffff; tampered stateless sig: 0xffffffff
- PqUnlock.isAuthorized (eth_call): true
- PqUnlock.unlock (state-changing tx 0x7cc0aae7a3b104429b1d62f6be7da072428efc4143a7beea2c87a154d627519e):
  SUCCESS, gasUsed 17,707,496; unlocked=false -> true,
  lastVerifiedHash=728df4be..., unlockCount=1
- PqUnlock.unlock with tampered sig (tx 0x614b33c7dce61ccdf4dcd6e3cac7a3d427ff8a2331e22686e5d82e20dea7e128):
  status 0 (reverted), gasUsed 2,098,752
- Quip example consumer isAuthorized: true, trustedKey=commitment
- All txs visible on explorer.aglais.quip.network (blocks 389539/389561/389574).
- EOA final balance 5.4225 AGLS (fauceted 10).

Limitations found:
- SHRINCS256sKeccak.verifyStateless delegates to a pinned CreateX CREATE3
  address (0xe52707C5...3864) that has no code on Aglais (CreateX does not
  exist on this Substrate chain), so the stateless delegation path reverts
  here. Worked around by calling the standalone SPHINCSPlusC256sKeccak
  verifier directly (deployed from the same source).
- pallet-revive revert reasons are empty in receipts (no revert string data).
- Repro script: ./verify-onchain.sh replays all read-only checks.

## Final cross-checks against Quip production

- Live V4 SHRINCS256sKeccak on OP Sepolia (canonical CreateX address
  0xF2f9E6D692da41b089c3c261c41509669eEc5567, the one ethereum-sdk@beta pins):
  runtime code keccak == the codehash pinned in the oak-03-and-06
  DeploySHRINCS256sKeccak.s.sol / DEPLOYMENTS.md (0xe9319929...) — i.e. the
  live deployment matches the vendor pin exactly.
- My wasm signature (hashsigs-wasm 0.2.1-rc9, the exact version
  ethereum-sdk@beta 0.3.0-beta.8 depends on) returns 0x024ad318 against that
  LIVE verifier via eth_call -> cross-validated.
- The oak-03-and-06 HEAD build I deployed to Aglais (runtime 3362 B) is
  NEWER than the live pinned artifact (4581 B): the branch moved past the
  deployed pin (no chain has a V4.0 deploy recorded in DEPLOYMENTS.md
  "Chains deployed: none yet"; the live one on Sepolia evidently predates
  the review/mr-26-fixes merge). verify() semantics for my signature are
  identical on both (both return 0x024ad318).
