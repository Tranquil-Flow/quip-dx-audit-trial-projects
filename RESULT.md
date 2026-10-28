# RESULT — On-chain verification of Quip Network post-quantum (WOTS+) signatures

## Status: **WORKING** (including the bonus testnet deployment and verification)

- A Foundry project with `QuipSignatureVerifier.sol`. It wraps Quip's official Solidity library `WOTSPlus` from [QuipNetwork/hashsigs-solidity](https://github.com/QuipNetwork/hashsigs-solidity), which implements WOTS+ with keccak256, w=16 and 67 chains.
- Signatures are made off-chain with Quip's official TypeScript library [`@quip.network/hashsigs`](https://www.npmjs.com/package/@quip.network/hashsigs) v0.1.0, in `offchain/sign.mjs`.
- The tests show that a valid signature passes and that tampered signatures, messages and keys fail.
- The contract is deployed on **Aglais, Quip's testnet** (chainId 20033). A signature was verified there in a mined transaction.

## Layout
| Path | What |
|---|---|
| `src/QuipSignatureVerifier.sol` | `verify(publicSeed, publicKeyHash, messageHash, bytes32[67] sig) → bool` (pure). `verifyAndConsume(...)` reverts on a bad signature, otherwise marks the one-time key as used and emits `QuipSignatureVerified`. |
| `lib/hashsigs-solidity` | Quip's WOTSPlus library, installed with `forge install`. It is linked as an external library. |
| `offchain/sign.mjs` | Creates a fresh WOTS+ keypair, signs `keccak256(message)`, checks the signature itself, then writes a JSON fixture. |
| `test/QuipSignatureVerifier.t.sol` | 11 tests, including a fuzz test and an FFI test. |
| `test/fixtures/*.json` | Signatures generated off-chain. `*.secret.json` files hold the matching throwaway one-time private keys. |
| `script/testnet-verify.sh` | Runs `eth_call` verification with valid and tampered inputs; with `--consume` it also sends a transaction. |
| `keys/deployer.json` | Brand-new throwaway testnet EVM key, created with `cast wallet new`. |

## How to run
```bash
# prerequisites: foundry, node 18+
(cd offchain && npm install)
forge build
forge test -vv                                  # 10 pass + 1 skipped (FFI)
QUIP_FFI=true forge test --ffi -vv              # also signs a fresh message via node during the test

# make a new off-chain signature
node offchain/sign.mjs "my message" test/fixtures/mine.json

# testnet (Aglais). Deploy:
PK=$(python3 -c "import json;print(json.load(open('keys/deployer.json'))[0]['private_key'])")
forge create lib/hashsigs-solidity/contracts/WOTSPlus.sol:WOTSPlus --rpc-url aglais --private-key $PK --broadcast
forge create src/QuipSignatureVerifier.sol:QuipSignatureVerifier \
  --libraries lib/hashsigs-solidity/contracts/WOTSPlus.sol:WOTSPlus:<WOTSPLUS_ADDR> \
  --rpc-url aglais --private-key $PK --broadcast
# verify against the deployed contract (use a fresh fixture for --consume: keys are one-time)
script/testnet-verify.sh 0x078D7D275F3A64349f72e6541b8fb38b7C6B7e4D test/fixtures/mine.json --consume
```

## Evidence
Local `forge test` output:
```
[PASS] testFuzz_AnyBitFlipFails(uint8,uint8) (runs: 256)
[PASS] test_TamperedChecksumChunkFails()      [PASS] test_TamperedMessageFails()
[PASS] test_TamperedSignatureChunkFails()     [PASS] test_ValidOffchainSignaturePasses()
[PASS] test_VerifyAndConsume_EmitsAndBurnsKey() [PASS] test_VerifyAndConsume_RevertsOnTampered()
[PASS] test_WrongPublicKeyHashFails()         [PASS] test_WrongPublicSeedFails()
[PASS] test_ZeroSignatureFails()              [PASS] test_FFI_FreshOffchainSignature() (with --ffi)
```

Aglais testnet (RPC `https://evm-rpc.aglais.quip.network:20049`, explorer `https://explorer.aglais.quip.network`):
| Item | Value |
|---|---|
| Deployer (throwaway) | `0xE57a15714a389E3AD26074eaf90C91E3e2915E47` |
| Faucet extrinsic | `0x29ff831a40d897bfedf1a50f6e191c43bc30c559fc3e13aa74d23e9dc0476127` |
| WOTSPlus library | `0x40a1c0d43d9ca56018A5E2a01e765254301e2859` (tx `0xa59e01e37d940229004aeb15770d8089533f6b9be81913fb300b7dead9b1f1b8`) |
| QuipSignatureVerifier | `0x078D7D275F3A64349f72e6541b8fb38b7C6B7e4D` (tx `0x0a5a7548ad08b3c368a8d9c2f326b43919dd73dfabcbadf0f77129180153a26e`) |
| **Valid** `verifyAndConsume`, `test/fixtures/testnet.json` | tx `0x8b180e74fa964017122b72dcfe16c42ac24371ba5c26c68cc1270b23c0da1ce8`: status 1, 1 `QuipSignatureVerified` log, block 374909. Blockscout reports `result: success`. |
| **Tampered** `verifyAndConsume`, `test/fixtures/testnet2.json` with chunk 0 zeroed | tx `0x2b96b4316dcd2ac59e6cdc4baea3df297495406f833bddd386cb1c997bbd1718`: status 0 (reverted) |
| `eth_call verify` | valid → `true`; one bit flipped in the signature → `false`; wrong message → `false` |
| `usedPublicKey(0x42e5…2c20)` after consuming | `true` |

## What did not work / caveats
- **The chainlist RPC is stale.** Chainlist (and Quip's own `QuipNetwork/chainlist` fork) lists `https://evm-rpc.testnet.quip.network:20049`, which does not resolve in DNS. The working endpoint is `evm-rpc.aglais.quip.network:20049`, which I found on https://agls.quip.network.
- **Wrong install name in the hashsigs-ts README.** It says `npm install hashsigs-ts`, which returns a 404. The real package is `@quip.network/hashsigs`.
- **Gas is much higher on the testnet.** Verification uses about 449k gas in Foundry's EVM, but the transaction on Aglais reported about **14.47M gas**. The chain runs pallet-revive, which converts its own resource accounting into eth gas. Budget for this; I found no documentation of it.
- **A tampered transaction can't be sent through normal gas estimation.** `cast send` stops at gas estimation because the call reverts with `InvalidQuipSignature`. I set `--gas-limit` by hand to get a mined, reverted transaction as evidence.
- **Keys from the TS and Solidity libraries don't match for the same seed.** `generateKeyPair` derives keys differently in each: TS computes `privateKey = H(privateSeed‖publicSeed)` from a given `publicSeed`, while Solidity derives `publicSeed` from the private key. Verification only needs `(publicSeed, publicKeyHash)`, so the two still work together. I confirmed this by reading source, not docs.
- **Not used:** Hardhat and Quip's `ethereum-sdk` QuantumVault/QuipFactory. Deploying the factory needs Quip's Deployer key ("contact Rick"), and no factory addresses are published for Aglais. A standalone verifier fits the task.
- **One-time keys.** WOTS+ keys must sign only one message. `verifyAndConsume` enforces this on-chain, but the pure `verify` does not. Off-chain, `sign.mjs` creates a new key for every message.

## What would have made this easier (vendor feedback)
1. A single developer page titled "Verify a Quip signature in Solidity", covering: library name and npm package, how the key and signature are laid out (`publicSeed ‖ publicKeyHash`, 67×32-byte chunks), the message hashing convention, and the one-time-key warning.
2. Fix the chainlist entry for 20033, which points at the dead `evm-rpc.testnet…` host, and the `hashsigs-ts` install name in its README.
3. Publish deployed `WOTSPlus` / QuipFactory addresses for Aglais, so apps can link to the existing library instead of deploying their own.
4. Document how pallet-revive gas on Aglais compares with EVM gas (~30× here) and whether plain solc bytecode is officially supported. It worked, but the "pallet-revive" label suggested `resolc` might be needed.
5. Make key derivation the same in the TS and Solidity `generateKeyPair`, or document that they differ, and ship shared test vectors that go from TS signing to Solidity verification.
