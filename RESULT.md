# RESULT — Quip Network on-chain post-quantum signature verification

## Status: WORKING (core + bonus complete)

- Foundry project with `QuipWOTSVerifier` — verifies Quip Network's hash-based WOTS+
  signature produced off-chain in TypeScript.
- 11/11 local Foundry tests pass, including: valid off-chain sig passes, tampered
  signature element fails, tampered message fails, wrong pubkey fails, replay fails.
- Deployed to Quip's Aglais testnet (chain 20033) and verified a live signature with a
  real transaction (evidence below).

## How to run

    # 1. install signer deps (once)
    cd signer && npm install && cd ..
    # 2. generate OFF-CHAIN test vectors (Quip WOTS+ signatures, TS)
    node signer/generate-vectors.js
    # 3. run Foundry tests (valid passes / tampered fails)
    forge test -vv
    # 4. live demo against Aglais testnet
    export RPC=https://evm-rpc.aglais.quip.network:20049
    export VERIFIER_ADDRESS=0x32640c693aA5202CA030C4D714A521D54E5d1719
    node signer/make-live-vector.js        # fresh throwaway WOTS+ key -> keys/live-wots-key.json
    forge script script/AglaisLive.s.sol --rpc-url $RPC  # static-check (no --broadcast; see notes)

Deploy (what I ran):

    forge create src/WOTSPlus.sol:WOTSPlus --rpc-url $RPC --private-key <throwaway> --legacy --broadcast
    forge create src/QuipWOTSVerifier.sol:QuipWOTSVerifier --rpc-url $RPC --private-key <throwaway> \
      --legacy --broadcast --libraries src/WOTSPlus.sol:WOTSPlus:0x986744B4Dc63AbE4Fc51B0154c75701A311CbfB8

Live on-chain verify + attestation (cast path — see "what did not work"):

    cast call $VERIFIER_ADDRESS $(cat keys/verify-calldata.txt) --rpc-url $RPC          # -> 0x...01
    cast call $VERIFIER_ADDRESS $(cat keys/verify-calldata-bad-sig.txt) --rpc-url $RPC  # -> 0x...00
    cast send $VERIFIER_ADDRESS $(cat keys/submit-calldata.txt) --private-key <throwaway> \
      --rpc-url $RPC --gas-price 1000000000 --legacy

## What was built

| File | Role |
|---|---|
| `src/WOTSPlus.sol` | Quip's own WOTS+ library, vendored verbatim from github.com/QuipNetwork/hashsigs-solidity (AGPL-3.0) |
| `src/QuipWOTSVerifier.sol` | My contract: stateless `verifySignature`, stateful `registerQuipKey` + `submitAttestation` (one-time-key burn), `messageDigest` helper |
| `signer/wots-signer.js` | Off-chain signer — faithful port of Quip's hashsigs-ts (keccak256, n=32, w=16 → 67×32B sig) |
| `signer/generate-vectors.js` | Deterministic test vectors (4 messages incl. empty + long) → `test/testvectors/vectors.json` |
| `signer/make-live-vector.js` | Fresh throwaway WOTS+ key (in `./keys`) + live message signing |
| `test/QuipWOTSVerifier.t.sol` | 11 tests: valid passes; tampered sig / tampered msg / wrong key / replay fail; gas (~406k gas/verify) |
| `script/AglaisLive.s.sol` | Live-network script (static verify valid+tampered, then broadcast) |

Scheme details (from reading Quip's source): WOTS+ over keccak256, n=32, w=16,
67 chains; public key = (publicSeed, publicKeyHash); PRF = keccak256(0x03 ‖ seed ‖ u16 idx);
signature = 67×32B = 2144 bytes; on-chain verify ≈ 406k gas local / 14.9M gas on Aglais
(pallet-revive metering differs).

## Evidence

Local (deterministic, reproducible):

    forge test → Suite result: ok. 11 passed; 0 failed (test/QuipWOTSVerifier.t.sol)
    verifySignature gas: 406333 (local anvil metering)

Aglais testnet (chain 20033, explorer https://explorer.aglais.quip.network):

- Throwaway deployer EOA: 0x8fb834109731824f450199112b7AC3a2471af840 (keys/deployer.json, testnet-only)
- Faucet funding extrinsic: 0xb8210aca6bf03febbccbc5a8769a8a67e6977125fa7165ee82e12bb25566b3aa (10 AGLS)
- WOTSPlus library deployed: 0x986744B4Dc63AbE4Fc51B0154c75701A311CbfB8
  - deploy tx: 0x9194d5c5c470a340dfff0bf96af5a61c0713c3d2068c584bc040bc5f6aed0fd5
- QuipWOTSVerifier deployed: 0x32640c693aA5202CA030C4D714A521D54E5d1719
  - registerQuipKey tx (success): 0x5cf25cc412d293b1c43ffb91d6c3eadee911ace9f35c4306acead96e8be66679
  - submitAttestation tx (valid off-chain WOTS+ sig ACCEPTED, QuipSignatureVerified event,
    block 375011, gasUsed 14,923,894, status 1):
    0x826f2d45460b3d92178306c0801883b5b07d3d7a4737754872d486abeace1ace
  - Static calls on the deployed contract:
    - valid signature → true (0x…01)
    - one byte of signature[0] flipped → false (0x…00)
    - one byte of the message flipped → false (0x…00)

## What did not work / gotchas

1. **quip.gitbook.io/docs is dead (404)** — the real docs are at developers.quip.network
   (linked from aglais.quip.network). Nothing there covers the signature libraries;
   I had to read hashsigs-solidity / hashsigs-ts source directly.
2. **`@noble/hashes` v2 breaks the import path** (`@noble/hashes/keccak` no longer exported;
   even in 1.7.x it's `…/sha3`). Pinned 1.7.1, exactly Quip's dependency.
3. **Solidity vs TS keygen differ**: hashsigs-solidity `generateKeyPair(seed)` derives the
   public seed; hashsigs-ts takes (privateSeed, publicSeed) separately. Off-chain signing
   must use the TS convention or signatures won't match the on-chain public key.
4. **`forge create` can't deploy contracts with linked libraries** — had to deploy WOTSPlus
   first and pass `--libraries`.
5. **`forge script --broadcast` txs are rejected by Aglais** ("error 1010 Invalid Transaction /
   1012 temporarily banned", pallet-revive backend). Plain `cast send --legacy --gas-price 1gwei`
   works. Static calls via forge script worked fine.
6. **Hand-rolled ABI encoding of bytes32[67] was wrong** (reverted) — use `cast calldata`.
7. **First tamper test flipped ABI padding**, not signature data → misleading "tampered passes".
   Re-done flipping real bytes: correctly false.
8. WOTS+ is one-time: contract burns the key after a successful attestation (replay protection).

## What would have made this easier (vendor docs/tooling)

- A single "verify a Quip signature on-chain" integration page: npm package names, the
  keccak256/n=32/w=16 parameter set, and a worked Solidity↔TypeScript example. The pieces
  exist (hashsigs-solidity, hashsigs-ts, ethereum-sdk) but are undocumented and unlinked.
- Publishing `@quip.network/hashsigs` on npm (package.json exists, no published dist found)
  would remove the port-from-source step.
- RPC/network details (evm-rpc.aglais.quip.network:20049, 1 gwei, pallet-revive quirks,
  "no pubsub/filter API", balances read one ED low) live on a marketing page, not in the
  developer docs; chainlist lacks the RPC URL.
- pallet-revive: clear error semantics for rejected forge-formed txs, or a Foundry
  compatibility note. Gas metering is ~35x local EVM — worth documenting for PQ contract devs.
- Stale READMEs: hashsigs-ts example import (`@noble/hashes/keccak`) doesn't work on any
  current version; the gitbook docs link on quip.network is dead.
