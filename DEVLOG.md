# DEVLOG — Quip Network on-chain WOTS+ signature verification

Goal: Foundry project with a Solidity contract that verifies a Quip hash-based (WOTS+)
signature produced off-chain; tests show valid passes / tampered fails. Bonus: Quip testnet deploy.

## Sources consulted (in order)

1. https://quip.network/ — company homepage. Post-quantum blockchain ("Compute-Consensus Layer",
   Substrate-based) + "Asset Layer" wrapping EVM/SVM/Bitcoin wallets with PQ cosignatures.
   Docs linked at quip.gitbook.io/docs (dead) and github.com/quipnetwork.
2. https://github.com/QuipNetwork (org) — key repos: hashsigs-rs (Rust), hashsigs-solidity
   (Solidity WOTS+), hashsigs-ts (TS WOTS+), ethereum-sdk (QuipWallet/Factory on EVM chains),
   quip-validator (Substrate node). READMEs are extremely thin — GitHub's HTML view strips
   their code-fence contents, so I went to source.
3. https://github.com/QuipNetwork/hashsigs-solidity + /hashsigs-ts — confirmed WOTS+
   (Winternitz One-Time Signature Plus), keccak256-based, params n=32 w=16 → 67 chunks,
   Foundry used upstream, AGPL-3.0.
4. `git clone --depth 1` hashsigs-solidity, hashsigs-ts, ethereum-sdk → ./vendor (read-only).
   READ SOURCE INSTEAD OF DOCS: contracts/WOTSPlus.sol, src/wotsplus.ts, test/WOTSPlus.t.sol,
   ethereum-sdk/{README,src/addresses.json,hardhat.config.ts}.
5. https://chainlist.org/chain/20033 — Aglais Testnet, chainId 20033, explorer
   explorer.aglais.quip.network. RPC URL was NOT listed on chainlist's text view.
6. https://github.com/QuipNetwork/quip-validator README — public testnet preset `quip-testnet`,
   EIP-155 id 20033, AGLS 12 decimals, Substrate RPC ws, chain spec at nodes.quip.network.
7. Probed candidate RPC hostnames (rpc.aglais/…, rpc.quip.network…) — DNS failures (dead end).
8. https://aglais.quip.network/ — the authoritative testnet page: EVM JSON-RPC
   https://evm-rpc.aglais.quip.network:20049, chain 20033, AGLS 18 decimals on EVM side,
   gas 1 gwei, backend pallet-revive, Blockscout explorer, faucet faucet.aglais.quip.network
   (curl-only), Substrate side separate. Docs at developers.quip.network/docs.
9. https://developers.quip.network/docs — developer portal index (not much on signatures).
10. https://github.com/foundry-rs/forge-std (clone for tests).

## Key findings from source reading (no docs existed for these)

- Quip's "hash-based signature" = WOTS+ (Winternitz One-Time Signature), keccak256, n=32, w=16:
  64 message chunks + 3 checksum chunks = 67 signature elements of 32 bytes (2144-byte sig).
- Public key ("Quip address") = (publicSeed, publicKeyHash); segments re-derived via
  PRF(0x03 ‖ seed ‖ u16 index).
- **Gotcha**: hashsigs-ts `generateKeyPair(privateSeed, publicSeed)` takes BOTH seeds as inputs,
  while hashsigs-solidity `generateKeyPair(privateSeed)` derives publicSeed = prf(privateKey,0).
  I used the TS convention (two seeds) with sign(privateKey, publicSeed, msgHash) — matches verify().
- ethereum-sdk deploys WOTSPlus library on EVM chains (addresses in src/addresses.json) for
  their wallet cosigner; that confirmed the on-chain verify() path is the intended integration.

## Commands & errors (what mattered)

- `forge --version` → 1.5.1; node v22.22.2 (already installed).
- `git clone` x4 (3 vendor repos + forge-std) — OK.
- `npm install @noble/hashes@latest` → v2.4.0 changed export paths; `require('@noble/hashes/keccak')`
  → ERR_PACKAGE_PATH_NOT_EXPORTED (error). **Deviation**: pinned `@noble/hashes@1.7.1` (exact
  version Quip's hashsigs-ts uses). In 1.7.x keccak_256 lives at `@noble/hashes/sha3` — README
  example (`@noble/hashes/keccak`) is stale even for 1.x. Verified: keccak256(empty)=c5d246…
- Wrote signer/wots-signer.js (faithful port of hashsigs-ts), signer/generate-vectors.js
  (deterministic vectors → test/testvectors/vectors.json), src/QuipWOTSVerifier.sol
  (wraps vendored WOTSPlus.sol), test/QuipWOTSVerifier.t.sol.
- `forge build` — OK (one upstream lint warning: unsafe-typecast in WOTSPlus.sol).
- `forge test` → 10 pass / 1 fail: my expectEmit compared the dynamic `gasUsed` param.
  Fixed test (check topics only). → **11/11 pass**.
- Testnet: `cast wallet new` → keys/deployer.json (throwaway, in ./keys, chmod 600).
  Note: JSON output is a LIST; my parse assumed dict (error, fixed).
- Faucet: `curl -X POST https://faucet.aglais.quip.network/request -d '{"dest":"0x…"}'`
  → extrinsic 0xb8210aca…; balance ≈ 10 AGLS (reads one ED low, as docs warned).
- RPC live check: chainId 0x4e41 ✓, gasPrice 1 gwei ✓, block gasLimit = u64::MAX
  (matches upstream foundry.toml comment — they clearly hit this limit before).
- `forge create QuipWOTSVerifier` → **Error: Dynamic linking not supported in `create`**
  (WOTSPlus is a library). Fixed: deploy library first, then `--libraries` flag.
  - WOTSPlus lib: 0x986744B4Dc63AbE4Fc51B0154c75701A311CbfB8 (tx 0x9194d5c5…)
  - QuipWOTSVerifier: 0x32640c693aA5202CA030C4D714A5d1719
- `forge script AglaisLive.s.sol --broadcast` → static calls PASSED (valid=true, tampered=false)
  but broadcast failed: **"error code 1010: Invalid Transaction / 1012 temporarily banned"**
  (pallet-revive + Foundry script tx-formation issue). Workaround: manual `cast send` with
  `--legacy --gas-price 1000000000` worked fine (plain transfer sanity check passed first).
- Hand-rolled ABI encoding for bytes32[67] was WRONG (reverted) — **deviation**: used
  `cast calldata` instead. Lesson: don't hand-encode; cast's encoder is correct.
- First "tampered" test flipped the LAST byte of calldata, which is message padding, not
  signature data → false positive "tampered passes". Re-tested flipping bytes INSIDE
  signature[0] and inside message[0] → both correctly return false.

## Live evidence (Aglais testnet, chain 20033)

- Deployer (throwaway): 0x8fb834109731824f450199112b7AC3a2471af840
- Faucet extrinsic: 0xb8210aca6bf03febbccbc5a8769a8a67e6977125fa7165ee82e12bb25566b3aa
- WOTSPlus library: 0x986744B4Dc63AbE4Fc51B0154c75701A311CbfB8 — deploy tx 0x9194d5c5c470a340dfff0bf96af5a61c0713c3d2068c584bc040bc5f6aed0fd5
- QuipWOTSVerifier: 0x32640c693aA5202CA030C4D714A521D54E5d1719
- registerQuipKey tx: 0x5cf25cc412d293b1c43ffb91d6c3eadee911ace9f35c4306acead96e8be66679 (success)
- submitAttestation tx (valid sig accepted, event emitted): 0x826f2d45460b3d92178306c0801883b5b07d3d7a4737754872d486abeace1ace — block 375011, gasUsed 14,923,894, status 1
- Static calls on the deployed contract:
  - valid off-chain sig → 0x…01 (true)
  - sig[0][0] byte flipped → 0x…00 (false)
  - message[0] byte flipped → 0x…00 (false)

## Guesses / deviations summary

1. quip.gitbook.io/docs 404s — used developers.quip.network + GitHub source instead (docs gap).
2. Pinned @noble/hashes 1.7.1 + sha3 import path (Quip dep, README stale).
3. Used TS keygen convention (two seeds) since off-chain signing is TS-side.
4. forge script broadcast rejected by pallet-revive node → manual cast send workaround.
5. Had to hand-discover calldata layout offsets to tamper-test raw calldata (fixed with cast calldata).
