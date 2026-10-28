# DEVLOG - Quip Network Post-Quantum Account PoC

## Research Sources (in order)

1. **Quip Network homepage** - https://quip.network/
   - Discovered Quip has two layers: Compute-Consensus Layer (blockchain) and Asset Layer (post-quantum protection)
   - Asset Layer wraps existing wallets on Ethereum, Solana, Bitcoin
   - Uses WOTS+ (Winternitz One-Time Signature) for quantum-resistant signatures

2. **Quantum Computing Report article** - https://quantumcomputingreport.com/postquant-labs-launches-quip-network-testnet-for-decentralized-quantum-classical-optimization/
   - Testnet launched April 2026
   - Open-sourced on GitHub
   - Consulted with D-Wave for quantum computing integration

3. **GitHub QuipNetwork org** - https://github.com/QuipNetwork
   - 40+ repositories
   - Key repos: ethereum-sdk (TS), hashsigs-rs (Rust), hashsigs-solidity, hashsigs-ts, quip-miner

4. **Quip Network docs (Gitbook)** - https://quip.gitbook.io/docs (returned 404)
   - Moved to https://developers.quip.network/docs

5. **Links page** - https://links.quip.network/
   - Post-quantum Accounts: https://account.quip.network/
   - QuipSwap, QVRF, Node running

6. **Aglais Testnet page** - https://agls.quip.network/
   - **Critical discovery**: Aglais is the Quip test network (chain ID 20033)
   - Token: AGLS (not QUIP)
   - EVM RPC: https://evm-rpc.aglais.quip.network:20049
   - Faucet: https://faucet.aglais.quip.network/request (POST with {"dest":"address"})
   - SS58 prefix: 42
   - Substrate RPC: wss://bootnode-{1-3}.aglais.quip.network:20049/rpc
   - Explorer: https://explorer.aglais.quip.network (Blockscout)

7. **Quickstart docs** - https://developers.quip.network/docs/getting-started/quickstart
   - Libraries: @quip.network/hashsigs-wasm, @quip.network/ethereum-sdk
   - NPM packages: `@quip.network/ethereum-sdk@beta`, `@quip.network/hashsigs-wasm@rc`

8. **Quip SDK docs** - https://developers.quip.network/docs/getting-started/quip-sdk
   - TypeScript SDK with `@quip.network/ethereum-sdk@beta`
   - SHRINCS (new) replaces WOTS+ (deprecated)
   - `npm install @quip.network/ethereum-sdk@beta` for current version

9. **ethereum-sdk GitHub** - https://github.com/QuipNetwork/ethereum-sdk
   - Smart contracts: QuipFactory, WOTSPlus, Deployer
   - Contract addresses: Deployer=0xF768b4E4A314C9119587b8Cd35a89bDC228290b5, WOTSPlus=0x1Ad02caBfc65ed65FDF6da64108f04f71E2e8991, QuipFactory=0x4a5A444F3B12342Dc50E34f562DfFBf0152cBb99

10. **SDK source code analysis** (src/index.ts)
    - QuipClient, QuipSigner, QuipWalletClient classes
    - Uses ethers.js for contract interaction
    - WOTS+ for post-quantum signatures (deprecated version)

11. **nodes.quip.network GitHub** - https://github.com/QuipNetwork/nodes.quip.network
    - Docker Compose deployment for Aglais testnet
    - Faucet at https://faucet.aglais.quip.network
    - Token name: AGLS

12. **Contract deployment verification** - Tested contracts on Aglais testnet
    - **None of the SDK contracts are deployed on Aglais** (chain ID 20033)
    - All return empty bytecode on Aglais EVM

13. **Contract deployment verification on Sepolia**
    - Old WOTS+ contracts ARE deployed: QuipFactory, WOTSPlus, Deployer ✅
    - New SHRINCS contracts are NOT deployed on Sepolia ❌

14. **Contract deployment verification on Base Sepolia**
    - SHRINCS contracts ARE deployed on Base Sepolia (chain ID 84532) ✅
    - ShrincsWalletImplementation: 0xc4E4652898bB12C4f0Ba9083829689B1963135E7
    - ShrincsPaymaster: 0x430c8c89492E3541e141148Dd7a7D6dD432e5890
    - ShrincsVerifier: 0xF2f9E6D692da41b089c3c261c41509669eEc5567

## Key Decisions

- **Network choice**: Base Sepolia (chain ID 84532) because SHRINCS contracts are deployed there
- **SDK version**: v1 SHRINCS (not deprecated WOTS+), uses viem not ethers
- **Package versions**: `@quip.network/ethereum-sdk@beta` (0.3.0-beta.8), `@quip.network/hashsigs-wasm@rc` (0.2.1-rc9)
- **Faucet**: Will use QuickNode Base Sepolia faucet or Alchemy for testnet ETH

## Errors & Dead Ends

1. Aglais testnet (chain ID 20033) does NOT have Quip smart contracts deployed
   - The Aglais testnet is the compute/mining layer, not the asset layer
   - Post-quantum accounts are on EVM L2s (Base Sepolia, OP Sepolia)

2. Gitbook docs at quip.gitbook.io/docs returned 404
   - Actual docs are at developers.quip.network/docs

3. faucet.aglais.quip.network returned 404 for GET requests
   - It's a POST-only API endpoint: `curl -X POST https://faucet.aglais.quip.network/request -H 'content-type: application/json' -d '{"dest":"YOUR_ADDRESS"}'`

4. SHRINCS contracts not on Sepolia - only on Base Sepolia and OP Sepolia
   - Had to verify each chain individually

## Architecture Understanding

Quip Network has a dual-layer architecture:
1. **Compute-Consensus Layer** (Aglais testnet, chain ID 20033)
   - The blockchain itself, mines blocks, issues AGLS tokens
   - Substrate-based with EVM compatibility (pallet-revive)
   - Used for proof-of-useful-work mining

2. **Asset Layer** (EVM L2s: Base Sepolia, OP Sepolia, Base mainnet, OP mainnet, Ethereum mainnet)
   - Post-quantum protection via SHRINCS wallets
   - Smart contracts: ShrincsWallet, ShrincsPaymaster, ShrincsVerifier, WalletFactory
   - Uses ERC-4337 Account Abstraction with post-quantum signatures
   - Each wallet is a deterministic CREATE3 deployment

The PoC will use the Asset Layer on Base Sepolia.
