# DEVLOG

## 2026-09-28 — Exploring Quip Network's testnet (Aglais) as a Solidity developer

Goal: deploy a simple ERC-20, mint to a second address, see txns + contract on a block explorer. Outcome: **WORKING**.

### Timeline (real time, my local clock)
- 14:04 — start. empty project, created `./keys/`.
- 14:05 — searched "Quip Network testnet Solidity documentation".
- 14:07 — read quip.network landing page. Read "what is Quip" docs page. Discovery: Quip is Substrate + has Asset Layer on Ethereum.
- 14:09 — explored GitHub org. Found `quip-validator` (Substrate fork) + `ethereum-sdk`.
- 14:11 — read `quip-validator/runtime/Cargo.toml`. **Confirmed**: runtime includes `pallet-revive` + `pallet-evm-chain-id` + `pallet-faucet-ops`. So the Quip L1 testnet runs EVM bytecode natively via pallet-revive. Chain ID 20033.
- 14:14 — faucet pallet source: `Root`-only mint, no public faucet. Initially thought this was a blocker.
- 14:16 — checked chainlist.org: discovered **Aglais** testnet landing page (`agls.quip.network`) with explicit RPC URL `https://evm-rpc.aglais.quip.network:20049` and Blockscout explorer `https://explorer.aglais.quip.network`.
- 14:18 — probed RPC: `eth_chainId` returned `0x4e41` (20033) ✓.
- 14:20 — faucet at `https://faucet.aglais.quip.network/request` (POST JSON `{"dest":"0x..."}`) drips 10 AGLS each.
- 14:21 — generated two throwaway keystores via `cast wallet new` (Alice + Bob).
- 14:22 — both got faucetted. ALICE `0x5cE77b...d10BC`, BOB `0xe9f51bC...DAE0`.
- 14:23 — wrote `src/QuipToken.sol` (vanilla ERC-20, owner-mintable, no imports). Foundry config.
- 14:24 — `forge build` OK.
- 14:25 — `forge create` deployed. **Tx succeeded**: contract `0xbF42E7A9...54aFAE` with initial supply 1,000,000 QUIPT to Alice.
- 14:26 — first mint attempt with default `--gas-limit 200000` — error 1010 (revert).
- 14:28 — bumped gas-limit to 2000000 — tx included but `status: 0 (failed)`. Even a minimal `Debug.ping(42)` contract failed the same way.
- 14:30 — checked the network-wide tx feed on Blockscout: other users have **successful** `mint` calls using ~5M gas. My tx used ~2M gas (out of 2M limit). **Hypothesis**: pallet-revive on Aglais has a much higher per-tx intrinsic gas cost than I assumed; my 2M was too low.
- 14:32 — re-sent mint with `--gas-limit 6000000 --gas-price 1000000000 --priority-gas-price 1`. **Status: success**. Bob got 500,000 QUIPT, total supply went to 1,500,000 QUIPT, Transfer event emitted.
- 14:35 — verified on Blockscout: contract page shows `token.name=QuipToken symbol=QUIPT type=ERC-20 holders=2 supply=1.5e24`. Deploy tx: status=ok, types=[contract_creation, token_creation, token_transfer]. Mint tx: status=ok, decoded=mint(address,uint256), 1 token transfer event 0→BOB.

## Pages visited / sources (in order I hit them)
- https://quantumcomputingreport.com/postquant-labs-launches-quip-network-testnet-for-decentralized-quantum-classical-optimization/ — initial search hit
- https://quip.network/ — main marketing site. "Compute-Consensus Layer" (Quip L1) + "Asset Layer" (wraps EVM chains).
- https://quip.gitbook.io/docs — **404 page not found**. CTAs on the marketing site point here.
- https://developers.quip.network/docs (real docs, Mintlify-powered, served at this subdomain; redirects from docs.quip.network)
- https://developers.quip.network/docs/getting-started/quickstart
- https://developers.quip.network/docs/getting-started/what-is-quip
- https://developers.quip.network/docs/getting-started/quip-sdk
- https://developers.quip.network/docs/nodes/run-a-node-testnet
- https://developers.quip.network/docs/network/token
- https://developers.quip.network/docs/getting-started/use-with-ai
- https://developers.quip.network/docs/quip-interlock-protocol/how-quip-fits-together.md
- https://developers.quip.network/docs/quip-interlock-protocol/quip-accounts.md
- https://github.com/QuipNetwork — org page
- https://github.com/QuipNetwork/quip-validator — repo (Substrate node)
- https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/runtime/Cargo.toml — runtime deps, contains `pallet-revive`
- https://github.com/QuipNetwork/quip-validator/tree/main/pallets — pallet list
- https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/runtime/src/lib.rs — chain ID, gas config
- https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/pallets/evm-chain-id/src/lib.rs — `TESTNET_CHAIN_ID = 20_033`, `LOCAL_CHAIN_ID = 1_337`
- https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/pallets/faucet-ops/src/lib.rs — Root-only mint (so the on-chain `pallet-faucet-ops` is operator-only)
- https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/node/src/chain_spec.rs — bootnodes, "AGLS" token symbol, 12 decimals (EVM uses 18)
- https://agls.quip.network — the **Aglais testnet landing page**; the link that unlocks the whole task. Lists `evm-rpc.aglais.quip.network:20049`, `explorer.aglais.quip.network`, `faucet.aglais.quip.network`, `portal.aglais.quip.network`, `subscan.aglais.quip.network`.
- https://chainlist.org/chain/20033 — third-party chainlist entry confirms same data (RPC, explorer)
- https://chainid.network/chain/20033/ — same
- https://faucet.aglais.quip.network/request — POST `{"dest":"0x..."}` returns `{"amount":10000000000000, "dest_account":"0x...eeee...", "extrinsic_hash":"0x..."}`
- https://evm-rpc.aglais.quip.network:20049 — JSON-RPC; `eth_chainId`=`0x4e41` (20033)
- https://explorer.aglais.quip.network — Blockscout explorer (with full REST API at `/api/v2/`)
- https://explorer.aglais.quip.network/api/v2/transactions — network-wide tx feed (where I observed the working `mint` from `0xf76110804651FBDb9EAAbaf544BCE1a932f046a0` and learned that ~5M gas was the right ballpark)
- https://explorer.aglais.quip.network/api/v2/addresses/<addr> — contract / EOA info (incl. auto-detected ERC-20 token metadata)

## Commands run (in order)

```
# Recon
mkdir -p keys && pwd && ls -la
# (browser + web search/extract against the URLs above)
curl .../eth_chainId   # → 0x4e41
curl .../eth_blockNumber  # → ~0x5bf21

# Keys
cast wallet new keys/alice alice --unsafe-password quip-test-pw     # addr 0x5cE77b29C39F2B556C24DAE2aB5f9Ce74fAF10BC
cast wallet new keys/bob   bob   --unsafe-password quip-test-pw     # addr 0xe9f51bc2c9CBfa8f71d53b2037CcA30ebeabdAE0

# Faucet
curl -X POST -H 'Content-Type: application/json' --data '{"dest":"0x5cE77b..."}' https://faucet.aglais.quip.network/request
curl -X POST -H 'Content-Type: application/json' --data '{"dest":"0xe9f51bC..."}' https://faucet.aglais.quip.network/request
# → both got ~10 AGLS (10^18 wei each, 18 decimals)

# Build
forge build    # OK (one info-level lint about unwrapped modifier logic)

# Deploy (this is where I had to iterate)
forge create --rpc-url https://evm-rpc.aglais.quip.network:20049 --chain-id 20033 \
  --keystore keys/alice/alice --password quip-test-pw \
  --broadcast src/QuipToken.sol:QuipToken \
  --constructor-args 1000000000000000000000000     # 1,000,000 * 1e18
# → Deployed to: 0xbF42E7A9A38a94ec0A1927Aae69487F96e54aFAE
# → Deployer: 0x5cE77b29C39F2B556C24DAE2aB5f9Ce74fAF10BC
# → tx: 0x4233f9b40a342729dd7f8c414e97ce358d7a78bf741a32d7004a438b2bf89abc

# Mint — first two attempts FAILED with status=0 (insufficient gas)
# Final successful call:
cast send --rpc-url https://evm-rpc.aglais.quip.network:20049 --chain-id 20033 \
  --keystore keys/alice/alice --password quip-test-pw \
  --gas-limit 6000000 \
  --priority-gas-price 1 --gas-price 1000000000 \
  0xbF42E7A9A38a94ec0A1927Aae69487F96e54aFAE \
  "mint(address,uint256)" 0xe9f51bc2c9CBfa8f71d53b2037CcA30ebeabdAE0 500000000000000000000000
# → status: 1 (success), gasUsed: 4,863,918, tx: 0xc14f824e22585898f6a68c68b8cf0129ec4de291ac5a85e5be7ab542fac6a769

# Verify
cast call ... 'name()(string)'                                   # "QuipToken"
cast call ... 'symbol()(string)'                                 # "QUIPT"
cast call ... 'decimals()(uint8)'                                # 18
cast call ... 'totalSupply()(uint256)'                          # 1500000000000000000000000
cast call ... 'balanceOf(address)(uint256)' 0x5cE77b...          # 1000000000000000000000000
cast call ... 'balanceOf(address)(uint256)' 0xe9f51bC...        #  500000000000000000000000
```

## Errors / dead ends
- `cast wallet new --keystore-dir` is not the flag; positional PATH is used in this Foundry build.
- `forge send` doesn't exist in this Foundry build; `cast send` works fine.
- First mint attempts with default `--gas-limit 200000` → error 1010 "Invalid Transaction" (rejected before mempool).
- Subsequent mints with `--gas-limit 2000000` got included but reverted (status=0, no logs). Even the trivial `Debug.ping(uint256)` failed the same way. Blockscout showed other users' successful `mint` calls used **~4.9M gas**, which tipped me off that pallet-revive on Aglais has a much larger intrinsic cost per call than the Ethereum L1 baseline. Bumping to `--gas-limit 6000000` made it work.
- `cast storage` returns 0 for pallet-revive contract storage slots because pallet-revive uses its own trie. Don't trust it — read via `cast call` (which routes through the pallet-revive-aware RPC) instead.
- Blockscout couldn't decode `revert_reason` for reverted contract calls (returns null) so I had to diagnose by elimination rather than from a clear error.

## Things that worked first try
- Reading the chain ID via `eth_chainId` (0x4e41).
- `forge create` deployment.
- Faucet call (10 AGLS each).
- Reading contract storage via `cast call`.
- Blockscout auto-recognition of the deployed contract as ERC-20 (`type=ERC-20`, name=symbol from the bytecode).

## Files in this project
```
DEVLOG.md
FRICTION.md
RESULT.md
foundry.toml
src/
  QuipToken.sol
  Debug.sol              # scratch contract used to confirm gas-limit hypothesis
QuipToken-meta.json
QuipToken-bytecode.txt
token-address.txt        # 0xbF42E7A9A38a94ec0A1927Aae69487F96e54aFAE
debug-address.txt        # 0x9ED67979307E0D4C2dc97a56E14E05d98a684Ff4
keys/
  alice/alice            # throwaway keystore (encrypted)
  bob/bob                # throwaway keystore (encrypted)
  *.create.log/.json     # cleared; artifacts
quip-src/                # cached source we read while learning
  runtime_lib.rs         # quip-validator/runtime/src/lib.rs
```