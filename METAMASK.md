# Adding Networks to MetaMask

## Ethereum Sepolia (Where This Contract Is Deployed)

### Via One-Click Links
Visit https://chainlist.org and search for "Sepolia", then click "Add to MetaMask".

### Manual Configuration
Open MetaMask > Settings > Networks > Add Network, and enter:

| Field         | Value                                    |
|---------------|------------------------------------------|
| Network Name  | Ethereum Sepolia                         |
| RPC URL       | https://ethereum-sepolia-rpc.publicnode.com |
| Chain ID      | 11155111                                 |
| Currency Symbol | ETH                                    |
| Block Explorer| https://sepolia.etherscan.io             |

---

## Quip Network Testnet (AGLS)

Quip Network's own chain is Substrate-based (not EVM). The MetaMask configuration
below lets you view balances and send native AGLS tokens, but **smart contracts
cannot be deployed via Solidity/EVM tooling on this chain**. Quip uses
`pallet-revive` for its own Wasm-based smart contract environment.

### Manual Configuration
Open MetaMask > Settings > Networks > Add Network > Custom Network, and enter:

| Field         | Value                                    |
|---------------|------------------------------------------|
| Network Name  | Quip Testnet (AGLS)                      |
| RPC URL       | https://bootnode-1.aglais.quip.network:9944 (WSS) |
| Chain ID      | 20033                                    |
| Currency Symbol | AGLS                                   |
| Block Explorer| https://nodes.quip.network (not yet available) |

> **Note:** The Quip testnet RPC may not support standard MetaMask connections
> (HTTPS RPC). The chain uses Substrate-native WebSocket RPC on port 9944.
> MetaMask added chain ID 20033 for network detection, but contract deployment
> requires Substrate-native tooling.

### How to Get AGLS Testnet Tokens
1. Run a Quip Network node: https://developers.quip.network/docs/nodes/run-a-node-testnet
2. Mining blocks earns AGLS tokens as block rewards (12-decimal token)
3. Use the desktop node manager: https://gitlab.com/quip.network/quip-node-manager/-/releases

---

## Why Sepolia Instead of Quip's Own Chain?

Quip Network's testnet (chain ID 20033, token AGLS) is built on Substrate with:
- `pallet-evm-chain-id` — reserves the chain ID number
- `pallet-revive` — Wasm smart contract execution (NOT the EVM)
- No Frontier EVM pallet — no `eth_*` RPC methods

The ethereum-sdk (https://github.com/QuipNetwork/ethereum-sdk) deploys Quip's
EVM smart contracts to **Ethereum Sepolia**, Base Sepolia, and Optimism Sepolia —
external EVM chains, not Quip's own chain.

For Solidity deployments, use Sepolia (Chain ID 11155111) as the primary target.
