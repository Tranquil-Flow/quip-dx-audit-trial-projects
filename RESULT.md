# RESULT — Quip Network testnet ERC-20 deployment via Foundry

Status: **WORKING**

## Summary
Goal achieved: deployed a self-written ERC-20 to Quip's Aglais testnet
(chain id 20033, RPC https://evm-rpc.aglais.quip.network:20049), minted
500 QUIPDEMO to a second key, and verified all three transactions plus the
contract on the Blockscout-based explorer at
https://explorer.aglais.quip.network. Also executed a third transaction
(an ERC-20 `transfer`) to fully exercise the chain.

## What was built

Project: `/private/tmp/devtrials7/v2-minimax-m3/erc20-quip/`

```
erc20-quip/
├── foundry.toml        # [rpc_endpoints] agls + [etherscan] agls (chain 20033)
├── src/QuipToken.sol   # ~80 LoC, 0.8.20, no external deps
├── lib/forge-std       # forge install pulled this
└── out/                # compiled artifacts
```

ERC-20 features: name/symbol/decimals/totalSupply, balanceOf, allowance,
approve, transfer, transferFrom, mint (public mint for ease of demo).
Constructor mints `initialSupply` to a designated holder.

## How to reproduce

```sh
# 1. brand-new throwaway keys (absolute paths only)
qb keygen /private/tmp/devtrials7/v2-minimax-m3/keys/deployer.key
qb keygen /private/tmp/devtrials7/v2-minimax-m3/keys/recipient.key

# 2. fund via the public faucet (10 AGLS / call)
curl -X POST -H 'Content-Type: application/json' \
  --data "{\"dest\":\"$(cat .../deployer.key|qb derive addr)\"}" \
  https://faucet.aglais.quip.network/request

# 3. deploy
forge create --rpc-url https://evm-rpc.aglais.quip.network:20049 \
  --private-key "$(cat .../deployer.key)" --chain-id 20033 \
  --broadcast src/QuipToken.sol:QuipToken \
  --constructor-args "Quip Demo Token" "QUIPDEMO" 1000000000000000000000000 0xDEPLOYER_ADDR

# 4. mint
cast send --rpc-url https://evm-rpc.aglais.quip.network:20049 \
  --private-key "$(cat .../deployer.key)" --chain-id 20033 \
  0xCONTRACT "mint(address,uint256)" 0xRECIPIENT_ADDR 500000000000000000000

# 5. verify
cast call --rpc-url https://evm-rpc.aglais.quip.network:20049 \
  0xCONTRACT "balanceOf(address)(uint256)" 0xDEPLOYER_ADDR
```

## Evidence

### Addresses
| Role | Address |
|---|---|
| Deployer (qb wallet key) | `0x2B01635f6E108c2F515Bca3F050995cAdEb84298` |
| Recipient (second key) | `0xEF8081C68992A3bBD27C90681d9D4c0DecB02073` |
| Contract `Quip Demo Token (QUIPDEMO)` | `0x9787B6D583419ee470e75BE9DEe85907B13feA73` |

### Transactions (all confirmed on https://explorer.aglais.quip.network)
| # | Action | Tx hash | Block | Status |
|---|---|---|---|---|
| 1 | Deploy | `0x730459e15b455e2fbf6b9d3e3ed2c991acf4539d4409288cbd172c3371e6c53e` | 416,994 | Success (1) |
| 2 | Mint 500 QUIPDEMO → recipient | `0xfec447632849a849255c8c5c76846471d98489579632b771294702885cb3b6a2` | 416,995 | Success (1) |
| 3 | Transfer 1 QUIPDEMO → recipient | `0x5d6257fd213aeb605c141e23fcdbd638ee2bd05e06a18ec29335e9f41427d278` | 417,029 | Success (1) |

### Explorer pages visited
- /tx/0x730459e15b...c53e (screenshot 0054.png — deploy Success, Block 416994, fee 0.783038078 AGLS)
- /tx/0xfec4476328...b6a2 (screenshot 0056.png — mint Success, 500 QUIPDEMO 0x0..0 → 0xEF..2073)
- /tx/0x5d6257fd...d278 (screenshot 0077.png — transfer Success, 1 QUIPDEMO 0x2B..4298 → 0xEF..2073)
- /address/0x9787B6D...eA73 (screenshot 0063.png — contract page, 2 txns)
- /address/0x9787B6D...eA73?tab=txs (screenshot 0064.png — Transactions tab: mint + contract creation)
- /address/0xEF8081C...2073 (screenshot 0066.png — recipient, Tokens 1)
- /address/0xEF8081C...2073?tab=tokens (screenshot 0071.png — recipient Tokens: Quip Demo Token, Quantity 500 → 501 after tx #3)
- /token/0x9787B6D...eA73?tab=holders (screenshot 0081.png — holders table: deployer 999,999 (99.95%), recipient 501 (0.05%))
- /token/0x9787B6D...eA73?tab=token_transfers (screenshot 0079.png — all 3 transfers)

### Live balances after the run
- Deployer:    999999 × 10^18 QUIPDEMO
- Recipient:   501 × 10^18 QUIPDEMO
- TotalSupply: 1,000,500 × 10^18 QUIPDEMO
- Deployer AGLS: ~7.2 (started 10, paid 0.783 deploy + 0.00487 mint + 0.00226 transfer + gas for queries)
- Recipient AGLS: ~10 (funded, never sent txns)

### RPC sanity
```
POST https://evm-rpc.aglais.quip.network:20049 eth_chainId    → 0x4e41 (= 20033) ✓
POST https://evm-rpc.aglais.quip.network:20049 eth_blockNumber → 0x65cd1 (≈ 417,233)
POST https://evm-rpc.aglais.quip.network:20049 eth_gasPrice    → 0x3b9aca00 (1 gwei ✓)
POST https://evm-rpc.aglais.quip.network:20049 eth_getBalance(deployer) → 0x8ac39585e5218000 (10^19 wei)
```
(:443 and bare-host variants also serve the same eth_chainId — likely a TLS load balancer.)

## Friction encountered
See FRICTION.md. Top items:
- The docs say `explorer.agls.quip.network` but the working subdomain is `explorer.aglais.quip.network` (NXDOMAIN).
- Quip docs have no "Deploy a Solidity contract" page; everything has to be reverse-engineered from the Aglais landing page's RPC/chain-id table plus existing Foundry knowledge.
- The faucet returns a "dest_account" field with a 24-'e' suffix — pallet-revive EVM-to-substrate mapping convention that isn't documented.
- The Blockscout `?tab=transactions` URL param doesn't work on the Aglais instance — must use `?tab=txs`.

## Top 5 changes to vendor materials

1. **Add a "Deploy a Solidity contract" page to developers.quip.network.** Foundry / cast / hardhat one-liners against `https://evm-rpc.aglais.quip.network:20049`, chain id 20033, gas price 1 gwei. Without it, every new EVM developer has to guess. (Priority: highest.)
2. **Fix the explorer subdomain everywhere.** Currently `agls.quip.network` (land­ing) advertises `explorer.agls.quip.network` which NXDOMAINs; the real explorer is `explorer.aglais.quip.network`. Either rename the landing page or DNS-redirect. (Priority: highest.)
3. **Document the faucet JSON shape on agls.quip.network.** Explain why the response has both `dest` (0x…) and `dest_account` (0x…eeeeeeeeeeeeeeeeeeeeeeee), that it's pallet-revive's substrate-mapping, and that ETH-side addresses are usable as-is.
4. **Show `forge/cast` (and `hardhat`) example configs.** Include a copy-pasteable `foundry.toml` with the Aglais rpc-endpoint and etherscan entries, so developers don't have to write one from scratch. Mirror the `QuipNetwork/hashsigs-solidity` repo's foundry.toml.
5. **Add a "Common mistakes" page or banner.** Specifically: (a) chain id (20033) ≠ RPC port (20049); (b) EVM gas reads return 0 because pallet-revive sets cumulativeGasUsed=0 — that's expected, look at gasUsed for the real number; (c) "transfers/h­olders" header counts on the token page lag the table — the table is authoritative.