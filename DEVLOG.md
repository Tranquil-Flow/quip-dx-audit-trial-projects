# DEVLOG — Quip Network testnet Foundry ERC-20 deployment

Every page opened in qb, in order. qb session name: v2-minimax-m3-r6.
## 1. DuckDuckGo search: "Quip Network testnet foundry deploy"
- screenshot 0001.png: duckduckgo.com homepage; search box = element 4
- typed query, pressed Enter -> 0002.png (typing), 0003.png blank (DDG lag)
- scroll 0004.png: results returned. Top hits:
  - 8: https://developers.quip.network/docs/getting-started/quickstart
  - 12: https://quip.network
  - 20: https://agls.quip.network
  - 28: https://t.co/OPnmsSJ4iP ("Run A Node (TestNet)")

## 2. https://developers.quip.network/docs/getting-started/quickstart
- screenshot 0005.png: Quickstart page. Top section: "The Quip Network protocol is published as open source software on GitHub and GitLab. There are two things you can do with it today: run a node, and generate quantum-resistant keys."
- Sidebar nav: Welcome(4), Quickstart(5), What is Quip Network?(6), Quip SDK(7), Use These Docs with AI(8)
- "Run a node" section: links to gitlab.com/quip.network/quip-node-manager/-/releases (21)
- "Generate quantum-resistant keys" section says: "Right now there's not much to do other than mine blocks, generate some quantum-resistant keys through our wallets on Ethereum, Solana, their L2s, and the Bitcoin L2s Arch and Midl, but we are building out the smart contract layer so you can take advantage of the quantum computers too."

## 3. https://developers.quip.network/docs/getting-started/quip-sdk
- 0006.png: "Quip Network publishes two SDKs" — for quantum smart contracts and a wallet/ABI-extension SDK
- 0007.png: Install section. KEY package table:
  - 21: @quip.network/ethereum-sdk  | 22: npm install @quip.network/ethereum-sdk@beta  | "account client for EVM chains"
  - 25: @quip.network/hashsigs-wasm  | 26: npm install @quip.network/hashsigs-wasm@rc
- 0008.png: Python: xquad[quip] via pip; no quip-swap SDK yet; "Use These Docs with AI" -> MCP server

## 4. https://developers.quip.network/docs/nodes/run-a-node-testnet
- 0013.png: page is about running a node, requires Docker. Does NOT contain public RPC URL or chain ID — just talks about downloading docker image and starting a node.

## 5. https://agls.quip.network/ — Aglais testnet landing page
- 0015.png: "Aglais is the Quip Network Testnet", token = AGLS. Buttons: Read the docs(5), Run a testnet node(6).
- 0017.png: KEY info table
  - EVM PUBLIC JSON-RPC: https://evm-rpc.aglais.quip.network:20049
  - CHAIN ID: 20033 · 0x4e41
  - TOKEN: AGLS · 18 decimals
  - GAS PRICE: 1 gwei · 0x3b9aca00
  - NETWORK NAME: Aglais Testnet (Quip Network)
  - BACKEND: pallet-revive
  - EXPLORER: explorer.agls.quip.network
  - Substrate side: LOCAL RPC ws://127.0.0.1:9944, NETWORK quip-testnet, TOKEN AGLS 12 decimals, SS58 PREFIX 42, CHAIN SPEC aglais-network.json, EXPLORER subscan.agls.quip.network, POLKADOT-JS portal.agls.quip.network, PUBLIC RPCS wss://bootnode-{1-3}.aglais.quip.network:20049/rpc
  - "Add it as a custom network in any EVM wallet, over an HTTP transport rather than WebSocket. There is no pubsub or filter API, and internal transactions and the gas tracker are unavailable. Balances read one existential deposit low, so confirm exact amounts on the substrate side."

## 6. https://explorer.aglais.quip.network/ — Blockscout explorer (worked)
- 0018.png: "Quip Testnet explorer", Blockscout. Stats: 416,452 blocks, 527 total txs, 406 wallet addresses, 6.3s block time.
- Already has Contract creation / Contract call txs visible.
- Title says "Quip Testnet" not "Aglais" but it's the same chain (chain id 20033).

## 7. JSON-RPC probe results
- POST https://evm-rpc.aglais.quip.network:20049 eth_chainId -> 0x4e41 (= 20033) ✓
- POST https://evm-rpc.aglais.quip.network:20033 -> 0x4e41 ✓
- POST https://evm-rpc.aglais.quip.network:443 -> 0x4e41 ✓ (TLS termination proxies to backend)
- POST https://evm-rpc.aglais.quip.network/ (default 443) -> 200 (proxied)
- Multiple ports answer eth_chainId → looks like a TLS load balancer.
- DNS: explorer.aglais.quip.network resolves; explorer.agls.quip.network does NOT.
  → Discrepancy between the docs (which say explorer.agls.quip.network) and the
    actual working URL (explorer.aglais.quip.network).

## 8. agls.quip.network continued (0031.png)
- SHARED BY BOTH SIDES section
    - GENESIS: 0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286
    - FAUCET: faucet.aglais.quip.network, POST /request  (element 3)
  - "ONE BALANCE, TWO SCALES" 1 AGLS = 10^12 native plancks = 10^18 EVM wei
  - The split: substrate shows 12 decimals, EVM shows 18 decimals.


## 9. github.com/QuipNetwork/hashsigs-solidity (Foundry-based reference)
- 0051.png: Foundry project, src/lib/test layout, WOTS+ post-quantum signatures in Solidity
- 0052.png: foundry.toml:
    - src = "src", out = "out", libs = ["lib"], optimizer=true, optimizer_runs=200
    - ffi=true
    - gas_limit = "18446744073709551615" # u64::MAX
    - production profile: via_ir=true, optimizer_runs=1000000
    - fmt: tab_width=4, int_types='long', bracket_spacing=false
  → Confirms pallet-revive semantics: u64 gas limits, no funny shenanigans.


## 10. Faucet + RPC probe
- qb keygen ./keys/deployer.key → 0x951E949bEb8eC8398A5F90f13EDF1fd8F4f0b726
- qb keygen ./keys/recipient.key → 0x44D4409d1F0BadaE2d423c1BdB2Db617fa7A7c35
- qb start v2-minimax-m3-r6 --wallet ./keys/deployer.key --chain 20033 → SESSION READY, wallet injected.
- POST https://faucet.aglais.quip.network/request {"dest":"0x951E..."}
  → 200 {"amount":10000000000000,"dest":"0x951E...","dest_account":"0x951e949beb8ec8398a5f90f13edf1fd8f4f0b726eeeeeeeeeeeeeeeeeeeeeeee","extrinsic_hash":"0x10cd4fdfbba4b737770bbe25b3c6b540134c2fb8f82662ee1aefbc1ec9e51b90"}
  → Note the EVM-mapped account ends in "eeeeeeeeeeeeeeeeeeeeeeee" (pallet-revive address mapping suffix)
- eth_getBalance on :20049, :443, and bare host → all return 0x8ac39585e5218000 (= 10^19 wei = 10 AGLS).

## 11. ERC-20 deployment + mint
- erc20-quip/ project created via `forge init`.
- src/QuipToken.sol — minimal self-written ERC-20 (no external deps), 18 decimals,
  public mint(), constructor(initialSupply, recipient).  0.8.20 pragma.
- foundry.toml — adds [rpc_endpoints] agls=https://evm-rpc.aglais.quip.network:20049,
  [etherscan] agls {key="", url=https://explorer.aglais.quip.network/api, chain=20033}.
- Regenerated keys with absolute paths:
  - /private/tmp/devtrials7/v2-minimax-m3/keys/deployer.key  (address 0x2B01...4298)
  - /private/tmp/devtrials7/v2-minimax-m3/keys/recipient.key (address 0xEF80...2073)
- Restarted qb session with --wallet pointing at the absolute path, funded via faucet
  (extrinsic 0xf4d920ad824916aabcbc147873c69abfed6e6aa6e511f29d17f70c84dee8d8a0).
- forge create --chain-id 20033 --rpc-url ...:20049 --private-key ...
  src/QuipToken.sol:QuipToken --constructor-args "Quip Demo Token" "QUIPDEMO" 1e24 deployer
  → contract 0x9787B6D583419ee470e75BE9DEe85907B13feA73, deploy tx 0x730459e15b455e2fbf6b9d3e3ed2c991acf4539d4409288cbd172c3371e6c53e
- cast send ... mint(address,uint256) recipient 5e20
  → mint tx 0xfec447632849a849255c8c5c76846471d98489579632b771294702885cb3b6a2, block 0x65ce3 (416,995), gas 4,870,326, status 1 (success).
- ERC-20 read-back:
  - balanceOf(deployer)  = 1e24
  - balanceOf(recipient)  = 5e20
  - totalSupply          = 1.0005e24
  - name / symbol correct.

## 12. Third tx + token page
- cast send ... transfer(address,uint256) recipient 1e18 (1 QUIPDEMO)
  → transfer tx 0x5d6257fd213aeb605c141e23fcdbd638ee2bd05e06a18ec29335e9f41427d278, block 0x65d05 (417,029), gas 2,259,144.
- Updated balances:
  - deployer    = 999_999e18
  - recipient   = 501e18
  - totalSupply = 1.0005e24
- Explorer verification of all three:
  - /tx/0x730459e15b...c53e  — deploy tx, status Success, block 416,994, method "Contract creation"
  - /tx/0xfec4476328...b6a2  — mint tx, status Success, method mint, 500 QUIPDEMO 0x000..0 → 0xEF..2073
  - /tx/0x5d6257fd...d278  — transfer tx, status Success, method transfer, 1 QUIPDEMO 0x2B..4298 → 0xEF..2073
  - /address/0x9787B6D...eA73 — contract shows 2 transactions (deploy + mint), 2 logs (Transfer events), creator at tx 0x730459...
  - /address/0xEF8081C...2073 — recipient Tokens tab shows 1 asset "Quip Demo Token" with quantity 500
  - /token/0x9787B6D...eA73?tab=holders — holders list: deployer 999,999 (99.95%), recipient 501 (0.05%)
  - /token/0x9787B6D...eA73?tab=token_transfers — all three transfers listed (1,000,000 init + 500 mint + 1 transfer).
