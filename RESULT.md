# RESULT

## Status
**WORKING.** Deployed an ERC-20 to the Quip Network / Aglais testnet and minted to a second address. Both transactions and the contract are visible on the Blockscout explorer.

## What I built
- A vanilla ERC-20 in Solidity 0.8.24 (`src/QuipToken.sol`) — owner-mintable, no imports, no OpenZeppelin. Constructor mints an initial supply to the deployer; `mint(address,uint256)` is owner-only.
- Foundry project (`foundry.toml`) pointed at `https://evm-rpc.aglais.quip.network:20049` (chain ID 20033).
- Two throwaway encrypted keystores under `keys/alice/` and `keys/bob/` for the deployer + recipient. Generated locally with `cast wallet new`. No real wallets / no mainnet keys touched.

## How to run it yourself
Prereqs: foundry (`forge`/`cast`), internet access.

```bash
# 1. throwaway keys (any password is fine, this is throwaway)
cast wallet new keys/alice alice --unsafe-password quip-test-pw
cast wallet new keys/bob   bob   --unsafe-password quip-test-pw

# 2. faucet both  (free, no rate-limit hit during testing)
ALICE=$(jq -r .address keys/alice/alice)  # or read the create.log
BOB=$(jq   -r .address keys/bob/bob)
curl -sS -X POST -H 'Content-Type: application/json' \
  --data "{\"dest\":\"$ALICE\"}" https://faucet.aglais.quip.network/request
curl -sS -X POST -H 'Content-Type: application/json' \
  --data "{\"dest\":\"$BOB\"}" https://faucet.aglais.quip.network/request

# 3. build & deploy
forge build
forge create --rpc-url https://evm-rpc.aglais.quip.network:20049 --chain-id 20033 \
  --keystore keys/alice/alice --password quip-test-pw \
  --broadcast src/QuipToken.sol:QuipToken \
  --constructor-args 1000000000000000000000000        # 1,000,000 * 1e18

# 4. mint from deployer to bob
TOKEN=<paste Deployed-to address>
cast send --rpc-url https://evm-rpc.aglais.quip.network:20049 --chain-id 20033 \
  --keystore keys/alice/alice --password quip-test-pw \
  --gas-limit 6000000 \                               # *** crucial on this chain, see below ***
  --priority-gas-price 1 --gas-price 1000000000 \
  $TOKEN "mint(address,uint256)" $BOB 500000000000000000000000

# 5. read state
cast call --rpc-url https://evm-rpc.aglais.quip.network:20049 $TOKEN 'totalSupply()(uint256)'
cast call --rpc-url https://evm-rpc.aglais.quip.network:20049 $TOKEN 'balanceOf(address)(uint256)' $BOB
```

## Evidence (real on-chain values)

### Addresses
- Deployer (Alice): `0x5cE77b29C39F2B556C24DAE2aB5f9Ce74fAF10BC`
- Recipient (Bob):   `0xe9f51bc2c9CBfa8f71d53b2037CcA30ebeabdAE0`
- Token contract:    `0xbF42E7A9A38a94ec0A1927Aae69487F96e54aFAE` (QuipToken / QUIPT, 18 decimals)

### Transactions
- Deploy (contract creation): `0x4233f9b40a342729dd7f8c414e97ce358d7a78bf741a32d7004a438b2bf89abc` — block 376628 — status `ok` — gas used 754,542,189 — fee 754,542,189,000,000,000 wei — types `[contract_creation, token_creation, token_transfer]`
- Mint (alice → bob):         `0xc14f824e22585898f6a68c68b8cf0129ec4de291ac5a85e5be7ab542fac6a769` — block 376711 — status `ok` — gas used 4,863,918 — fee 4,863,918,000,000,000 wei — method `mint(address,uint256)` — token transfer 0x0… → BOB 500,000,000,000,000,000,000,000

### Final on-chain token state (via RPC)
- `name = "QuipToken"`
- `symbol = "QUIPT"`
- `decimals = 18`
- `owner = 0x5cE77b29C39F2B556C24DAE2aB5f9Ce74fAF10BC` (Alice)
- `totalSupply = 1500000000000000000000000` (1,500,000 QUIPT)
- `balanceOf(alice) = 1000000000000000000000000` (1,000,000 — initial supply)
- `balanceOf(bob)   =  500000000000000000000000` (500,000 — minted)

### Final AGLS (native) balances
- Alice: 8.502888446131 AGLS (started at 10, spent ~1.5 in gas across the deploy + 5 mints + the 1-wei self-transfer I used as a sanity check)
- Bob:   9.999 AGLS (just from the faucet)

### Explorer links (live, public)
- Token contract page: https://explorer.aglais.quip.network/address/0xbF42E7A9A38a94ec0A1927Aae69487F96e54aFAE
- Deploy tx:           https://explorer.aglais.quip.network/tx/0x4233f9b40a342729dd7f8c414e97ce358d7a78bf741a32d7004a438b2bf89abc
- Mint tx:             https://explorer.aglais.quip.network/tx/0xc14f824e22585898f6a68c68b8cf0129ec4de291ac5a85e5be7ab542fac6a769
- Alice EOA:           https://explorer.aglais.quip.network/address/0x5cE77b29C39F2B556C24DAE2aB5f9Ce74fAF10BC
- Bob EOA:             https://explorer.aglais.quip.network/address/0xe9f51bc2c9CBfa8f71d53b2037CcA30ebeabdAE0

Blockscout automatically recognised the deployed bytecode as an ERC-20 and populates `name`, `symbol`, `decimals`, `holders_count`, `total_supply`, and lists `transfer`/`mint` events on the contract page. The mint tx page shows the `mint(address,uint256)` call decoded and the `0x0… → BOB` token transfer.

## What did not work, and why

### Failed mints before the gas-limit bump
- First attempt: `cast send --gas-limit 200000 ... mint(...)` → "Error: server returned an error response: error code 1010: Invalid Transaction" (rejected before inclusion).
- Second attempt: `cast send --gas-limit 2000000 ... mint(...)` → included in block 376648, but `status: 0 (failed)`, no logs. A trivial `Debug.ping(uint256)` on a separate contract behaved identically.
- A successful `mint` by `0xf761108046…` on the same chain used **4,940,691** gas with a 4,943,924 limit. My 2,000,000 was about half of that — the tx hit pallet-revive's intrinsic gas cost before reaching my contract code. **Fix**: `--gas-limit 6000000`. Not documented anywhere; I had to read the Blockscout tx feed to find a working example.

### The `cast run` trace was misleading
- `cast run <failed-mint-tx>` printed `Transaction successfully executed` and showed the `Transfer` event being emitted, which made me think the receipt's `status: 0` was a Blockscout reporting bug. It wasn't — `cast run` re-simulates from current (post-revert) state, so the trace shows the happy path even when the real execution reverted. Trust the receipt, not the trace.

### `forge send` doesn't exist in this Foundry build
- Forge v1.5.1-stable only ships `forge create`, `forge script`, `cast send`. Had to swap to `cast send` with a different flag layout (`--gas-price` + `--priority-gas-price`, not `--max-fee-per-gas`).

### Verification on Blockscout
- I have the deployed bytecode + metadata in `QuipToken-meta.json` / `QuipToken-bytecode.txt` but did not submit them through Blockscout's verification API in this session. Blockscout's contract page shows the contract but flags it as `is_verified: false`. The contract still auto-shows ERC-20 metadata from the bytecode (name, symbol, decimals) so the visible-on-explorer goal is met; full source verification is the only thing missing.

### Things I noticed but didn't fully resolve
- The native token on Quip L1 is `AGLS` (12 decimals on the Substrate side via `NativeToEthRatio = 10^(18-12)`, 18 on the EVM side); the docs talk about `$QUIP` which is the planned mainnet token. There is no public RPC for the native Substrate extrinsics — only the EVM bridge.
- `chain_spec.rs` references a `nodes.quip.network` JSON file under `chain-specs/aglais-network.json`, but that domain currently serves a TLS handshake error from its LB, so the raw chain spec is not actually published.

## Top 5 changes to the vendor's docs/site that would have helped me most

1. **Put the RPC URL on the developers.quip.network docs.** One line under the Quickstart: "Public Aglais testnet RPC: `https://evm-rpc.aglais.quip.network:20049` (chain ID 20033). Faucet: `https://faucet.aglais.quip.network/request`, POST `{"dest":"0x…"}`. Explorer: https://explorer.aglais.quip.network." This would save ~15 min of guessing + chainlist fishing.

2. **Add a "Deploy an ERC-20" page** (or even just a paragraph under Quickstart) that says: "Aglais runs pallet-revive, so you can deploy Solidity contracts the same way you would on any EVM L1. Hardhat/Foundry work; use `--gas-limit ≥ 6_000_000` for state-writing calls." The pallet-revive intrinsic gas cost was the single biggest time sink (45 min), and it's never mentioned anywhere.

4. **Fix the dead `https://quip.gitbook.io/docs` link on quip.network.** Either redirect it to `https://developers.quip.network/docs` or remove it.

5. **Remove or correct the "Connection details for the public test network have not been published yet" sentence** in `/docs/compute/submit-a-job.md`. It is wrong, and it's the first thing a searcher sees.

6. **Document the gas-cost difference on the developer docs.** A short note like "pallet-revive charges an extrinsic overhead of ~X gas per EVM call, so always set `--gas-limit ≥ 6_000_000` until you have an estimate". This is the difference between "first tx succeeds" and "40 minutes of confusion."