# DEVLOG — Quip Network Testnet Counter Contract Deployment

## Sources Consulted (in order)

1. https://quip.network — Main website, found "worldwide quantum computer" branding
2. https://developers.quip.network/docs — Developer portal, quickstart, SDK docs
3. https://github.com/QuipNetwork — GitHub org, 33 repos including ethereum-sdk, quip-validator
4. https://github.com/QuipNetwork/ethereum-sdk — Hardhat project deploying to Sepolia/Base/Optimism
5. https://github.com/QuipNetwork/quip-validator — Substrate fork, chain specs, EVM chain ID 20033
6. https://github.com/QuipNetwork/quip-validator/blob/main/runtime/Cargo.toml — Runtime dependencies
7. https://github.com/QuipNetwork/quip-validator/blob/main/node/src/rpc.rs — RPC module (no EVM)
8. https://github.com/QuipNetwork/quip-validator/blob/main/node/src/chain_spec.rs — Chain spec builder
9. https://github.com/QuipNetwork/quip-validator/blob/main/node/src/service.rs — Node service setup
10. https://developers.quip.network/docs/getting-started/quickstart — Quickstart page
11. https://developers.quip.network/docs/getting-started/quip-sdk — SDK documentation
12. https://developers.quip.network/docs/quip-interlock-protocol/how-quip-fits-together — Architecture
13. https://developers.quip.network/docs/network/participants — Network participants
14. https://developers.quip.network/docs/nodes/run-a-node-testnet — Node running guide
15. https://sepolia-faucet.pk910.de/ — PoW faucet (requires browser mining)
16. https://faucet.quicknode.com/ethereum/sepolia — QuickNode faucet (requires mainnet balance)
17. https://sepoliafaucet.com — Alchemy faucet (requires mainnet balance + activity)

## Key Findings

### Quip Network Architecture (CRITICAL DISCOVERY)
Quip Network's own testnet is NOT EVM-compatible. It is a Substrate-based chain
with the following characteristics:

- **Chain ID:** 20033 (EIP-155)
- **Token:** AGLS (12 decimals)
- **Consensus:** BABE + GRANDPA (hybrid, with post-quantum key support)
- **Bootnodes:** bootnode-{1,2,3}.aglais.quip.network
- **Smart contracts:** `pallet-revive` (Wasm-based, NOT EVM)
- **Chain spec:** https://nodes.quip.network/chain-specs/aglais-network.json

The runtime Cargo.toml includes:
- `pallet-evm-chain-id` — Just reserves the chain ID number for wallet compatibility
- `pallet-revive` — Substrate's smart contract pallet (successor to pallet-contracts)
- NO `pallet-evm` or Frontier EVM — No EVM execution environment
- NO `sc-rpc-server` with EVM extensions

The RPC module (node/src/rpc.rs) only exposes:
- `System` (substrate-frame-rpc-system) — Basic chain queries
- `TransactionPayment` — Fee queries  
- `Babe` — BABE consensus
- NO `eth_*` methods, no EVM JSON-RPC

### EVM Deployment Target
Quip's ethereum-sdk (https://github.com/QuipNetwork/ethereum-sdk) deploys to:
- Ethereum Sepolia (chain ID 11155111)
- Base Sepolia (chain ID 84532)
- Optimism Sepolia (chain ID 11155420)
- Ethereum Mainnet, Base, Optimism
- BSC, Avalanche, Polygon, Mantle, Celo, Arbitrum, Degen

NOT to Quip's own chain. This is the intended target for Solidity deployments.

### Bootnode Connectivity
Attempted connections to bootnode-1.aglais.quip.network (45.27.50.228):
- Port 9944 (WSS): Timeout during opening handshake
- Port 80 (WS): Connection reset
- Port 443 (HTTPS): Connection reset
- DNS resolves correctly but RPC is not accessible from this machine

### Faucet Accessibility
All Sepolia faucets require either:
- Mainnet ETH balance (Alchemy, QuickNode)
- Mainnet transaction history (Alchemy)
- Browser-based PoW mining (pk910.de, requires Cloudflare Turnstile)
- None work from CLI/headless browser in this environment

## Timeline

### 2026-09-28 ~09:15 UTC — Research Phase
- Searched quip.network, found it's a quantum computing network
- Discovered ethereum-sdk and quip-validator repos on GitHub
- Read ethereum-sdk: Hardhat project targeting Sepolia/Base/Optimism
- Read quip-validator: Substrate fork, chain ID 20033, token AGLS

### 2026-09-28 ~09:20 UTC — Architecture Investigation
- Read runtime/Cargo.toml: Found pallet-revive, pallet-evm-chain-id
- NO pallet-evm or Frontier in dependencies
- Read node/src/rpc.rs: Only standard Substrate RPC methods
- Read node/src/service.rs: No EVM service extensions
- Read node/src/chain_spec.rs: Chain spec builder with AGLS token

### 2026-09-28 ~09:25 UTC — Connectivity Test
- Attempted WSS connection to bootnode-1.aglais.quip.network:9944 — timeout
- Attempted WS/HTTPS on ports 80, 443 — connection reset
- DNS resolves to 45.27.50.228 but RPC not accessible
- Quip testnet appears to have restricted RPC access

### 2026-09-28 ~09:30 UTC — Project Setup
- Created project directory with Hardhat 2.22, toolbox, dotenv
- Wrote Counter.sol (increment function, public count)
- Wrote hardhat.config.js targeting Sepolia
- Compiled successfully with Solidity 0.8.28

### 2026-09-28 ~09:35 UTC — Key Generation
- Generated throwaway private key: 9be8156b...1a536d
- Address: 0xa54597221a3C5C91AffE3f93903031FacbE945B2
- Saved to keys/deployer.json

### 2026-09-28 ~09:40 UTC — Deployment Attempts
- Local Hardhat deployment: SUCCESS
  - Contract at 0x5FbDB2315678afecb367f032d93F642f64180aa3
  - 3 increments, count went from 0 to 3
- Sepolia deployment: BLOCKED (no testnet ETH)
  - Alchemy faucet: requires mainnet balance + activity
  - QuickNode faucet: requires mainnet balance
  - PoW faucet: Cloudflare blocks headless browser
  - Chainstack faucet: API returns "Method Not Allowed"
  - Google Cloud faucet: no API response
  - Paradigm faucet: no API response

### 2026-09-28 ~09:50 UTC — Documentation
- Created METAMASK.md with network config for both Sepolia and Quip testnet
- Created DEVLOG.md with full research trail
- Created RESULT.md with status and evidence

## Guesses and Deviations

1. **GUESS:** The user likely expected a Substrate chain with EVM compatibility
   (like Acala, Moonbeam). In reality, Quip's chain uses pallet-revive, which
   is a completely different execution environment. The "EVM-compatible" descriptor
   may refer to the wallet layer (MetaMask support for chain ID 20033) rather
   than smart contract compatibility.

2. **DEVIATION:** Deployed to local Hardhat instead of Sepolia because all
   accessible faucets required mainnet ETH or browser-based mining that
   couldn't be automated in this environment.

3. **GUESS:** The bootnode RPC is likely restricted to node operators or
   requires specific authentication. The nodes.quip.network site was also
   unreachable.

4. **DEVIATION:** Used Hardhat 2.x instead of Hardhat 3.x because the
   Hardhat 3.x ESM requirement and incompatible toolbox package caused
   repeated installation failures.

5. **NOTE:** The `pallet-revive` pallet is Substrate's next-generation smart
   contract environment. It supports compiling Solidity to Wasm via
   `cargo-contract` toolchain, but this is NOT EVM bytecode execution.
   Standard EVM tools (Hardhat, Foundry) cannot deploy to it.
