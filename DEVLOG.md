# DEVLOG — Quip post-quantum signature verification on-chain

Start: Mon 28 Sep 2026 11:14:01 CEST

## Sources consulted (in order)
1. GitHub API: https://api.github.com/orgs/QuipNetwork/repos — found hashsigs-solidity, hashsigs-ts, hashsigs-rs, ethereum-sdk, chainlist
2. Cloned (depth 1, into ./vendor for reading only): https://github.com/QuipNetwork/hashsigs-solidity , hashsigs-ts , hashsigs-rs , ethereum-sdk
   - hashsigs-solidity/contracts/WOTSPlus.sol: WOTS+ (w=16, n=32, keccak256, 67 chains) library with `verify(WinternitzAddress{publicSeed,publicKeyHash}, WinternitzMessage{messageHash}, WinternitzElements{bytes32[67]})`
   - hashsigs-ts/src/wotsplus.ts: off-chain keygen/sign/verify
   - ethereum-sdk README: QuipFactory/QuantumVault ("Quip wallet") contracts, deployed on Sepolia/Base/etc. Mentions WOTSPlus at 0x1Ad02caBfc65ed65FDF6da64108f04f71E2e8991 on mainnets. No Quip testnet mentioned.
3. `npm view @quip.network/hashsigs` -> versions 0.0.1, 0.1.0 (latest), 0.2.0-rc.1/rc.2
4. WebSearch "Quip Network testnet RPC chain id EVM" -> https://chainlist.org/chain/20033 (Aglais Testnet)
5. Cloned https://github.com/QuipNetwork/chainlist -> constants/additionalChainRegistry/chainid-20033.js lists rpc https://evm-rpc.testnet.quip.network:20049
6. https://agls.quip.network (official testnet page) — EVM RPC https://evm-rpc.aglais.quip.network:20049, chainId 20033, backend **pallet-revive**, faucet POST https://faucet.aglais.quip.network/request {"dest":addr}, explorer https://explorer.aglais.quip.network, docs https://developers.quip.network/docs

## Gotchas / deviations
- hashsigs-ts README says `npm install hashsigs-ts` -> **404 on npm**. Real package name (from package.json) is `@quip.network/hashsigs`.
- Key derivation differs between the Solidity `generateKeyPair(privateSeed)` (privateKey=prf(seed,0), publicSeed=prf(privateKey,0)) and the TS `generateKeyPair(privateSeed, publicSeed)` (privateKey = keccak(privateSeed||publicSeed)). The *verify* side only needs (publicSeed, publicKeyHash) so they're interoperable; keys just aren't reproducible across libs from the same seed. Learned by reading source, not docs.
- **Dead end:** chainlist's RPC `evm-rpc.testnet.quip.network` does NOT resolve (DNS NXDOMAIN) and explorer.testnet.quip.network is unreachable. The correct host is `evm-rpc.aglais.quip.network:20049` (from agls.quip.network). chainlist entry is stale.
- Testnet RPC probe: eth_chainId=0x4e41 (20033), gasPrice 1 gwei, web3_clientVersion `eth-rpc/HEAD-f17113f` (Polkadot pallet-revive eth-rpc proxy).
- Testnet page says backend is pallet-revive; I expected to possibly need `resolc` (PolkaVM). **Guess that turned out unnecessary**: plain solc 0.8.28 EVM bytecode deployed and ran fine via `forge create`.

## Commands that mattered (in order)
```
curl https://api.github.com/orgs/QuipNetwork/repos
git clone --depth 1 https://github.com/QuipNetwork/{hashsigs-solidity,hashsigs-ts,hashsigs-rs,ethereum-sdk,chainlist}   # into ./vendor, reference only
npm view @quip.network/hashsigs versions            # 0.1.0 latest
curl eth_chainId https://evm-rpc.testnet.quip.network:20049   -> DNS fail (dead end)
curl eth_chainId https://evm-rpc.aglais.quip.network:20049    -> 0x4e41
forge init --no-git --force .
forge install --no-git QuipNetwork/hashsigs-solidity          # official Solidity verifier lib (commit 3b20d60)
(cd offchain && npm i @quip.network/hashsigs@0.1.0 @noble/hashes viem)
node offchain/sign.mjs "Quip post-quantum hello from Foundry" test/fixtures/sig1.json
forge test                                   # 10 pass, 1 skipped (FFI)
QUIP_FFI=true forge test --ffi --mt FFI      # pass
cast wallet new --json > keys/deployer.json  # brand-new throwaway key 0xE57a15714a389E3AD26074eaf90C91E3e2915E47
curl -X POST https://faucet.aglais.quip.network/request -d '{"dest":"0xE57a…"}'  -> extrinsic 0x29ff831a…6127 ; balance 9.999 AGLS
forge create lib/hashsigs-solidity/contracts/WOTSPlus.sol:WOTSPlus --rpc-url aglais --broadcast
forge create src/QuipSignatureVerifier.sol:QuipSignatureVerifier --libraries ...WOTSPlus:0x40a1… --rpc-url aglais --broadcast
script/testnet-verify.sh 0x078D7D275F3A64349f72e6541b8fb38b7C6B7e4D test/fixtures/testnet.json --consume
cast send ... verifyAndConsume(<tampered>) --gas-limit 30000000   # force a mined, reverted tx
curl https://explorer.aglais.quip.network/api/v2/transactions/0x8b18…  # blockscout confirms success
```

## Errors hit
1. `ERR_PACKAGE_PATH_NOT_EXPORTED ./sha3` — @noble/hashes v2 requires `@noble/hashes/sha3.js`. Fixed import.
2. solc: `Invalid array length` for `bytes32[WOTSPlus.NumSignatureChunks]` — library constants aren't usable as array length from another contract; hard-coded 67.
3. solc: `Documentation tag @quip.network/hashsigs not valid` — `///` NatSpec comment containing `@...` parsed as tag; switched to `//`.
4. Tampered `verifyAndConsume` via cast fails at gas estimation (expected revert `InvalidQuipSignature`, selector 0x7fb995ef). To get on-chain evidence I forced `--gas-limit 30000000` -> mined with status 0.

## Observations
- Gas: verify ≈ 449k gas in Foundry's EVM, but the same `verifyAndConsume` reported **gasUsed 14,465,368** on Aglais (pallet-revive maps weight+storage deposit into eth gas). Cost at 1 gwei ≈ 0.0145 AGLS. Not documented anywhere I found.
- WOTS+ is a one-time signature scheme; the Solidity lib README doesn't say so explicitly (comments in code do). My contract burns the public key after `verifyAndConsume`.
- Did not use Hardhat or the ethereum-sdk QuantumVault/QuipFactory — task only needed signature verification; the factory would require Quip's Deployer (README: "contact Rick"), and no Aglais addresses are published for it.
- vendor/ holds read-only clones used for reading source; not part of the build.

End: Mon 28 Sep 2026 11:19:17 CEST. Final status WORKING — see RESULT.md.
