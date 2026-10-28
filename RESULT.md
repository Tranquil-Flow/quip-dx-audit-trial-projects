# RESULT — Quip Network Testnet Counter Contract Deployment

## Status: PARTIAL

The Counter contract compiles and deploys correctly. Full testnet deployment
to Quip's own chain was **not possible** because Quip's testnet is Substrate-based,
not EVM-compatible. Deployment to Ethereum Sepolia (Quip's actual EVM target) was
**blocked by faucet requirements** (all accessible faucets require mainnet ETH
balance or browser-based mining).

## What Was Built

### Contract: Counter.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Counter {
    uint256 public count;
    event CountIncremented(uint256 newCount);

    function increment() external {
        count += 1;
        emit CountIncremented(count);
    }
}
```

### Scripts
- `scripts/deploy.js` — Deploys Counter to configured network
- `scripts/increment.js` — Increments 3x and reads final count
- `scripts/deploy_and_interact.js` — Combined deploy + 3 increments

### Configuration
- `hardhat.config.js` — Hardhat 2.22 with Sepolia network (chain ID 11155111)
- `.env` — RPC URL and private key
- `keys/deployer.json` — Throwaway private key (0xa5459722...)

## How to Run

### Local (works now)
```bash
cd /private/tmp/devtrials2/t06-mimo-v2.5
npm install
npx hardhat compile
npx hardhat run scripts/deploy_and_interact.js
```

### Sepolia (requires testnet ETH)
```bash
# 1. Get 0.1 Sepolia ETH from a faucet (requires mainnet balance)
# 2. Fund the address: 0xa54597221a3C5C91AffE3f93903031FacbE945B2
# 3. Deploy:
npx hardhat run scripts/deploy.js --network sepolia
# 4. Interact:
npx hardhat run scripts/increment.js --network sepolia
```

## Evidence (Local Hardhat Deployment)

```
=== DEPLOYMENT ===
Deploying Counter with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account balance: 10000.0 ETH
Counter deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Network: hardhat Chain ID: 31337

=== INTERACTION ===
Initial count: 0

Calling increment() #1...
  Tx hash: 0x44b86afdddcb21c9924d05e2b66bada694fd429a6fc2ea5dbbba9b6bf29c5d0f
  Block: 2
  Count now: 1

Calling increment() #2...
  Tx hash: 0x02655e081af1b462660f7570e8ce9552711cb9b3dbbc534b9ae0ae31d25fb74d
  Block: 3
  Count now: 2

Calling increment() #3...
  Tx hash: 0xeb117bbf9160534efa149bf53a651fad9e1cc1e4e6a4cb722787cd95cdd664b4
  Block: 4
  Count now: 3

=== SUMMARY ===
Final count: 3
```

- Contract address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Deployer: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (Hardhat default)
- All 3 increment transactions confirmed, count correctly went 0 → 1 → 2 → 3

## What Did NOT Work and Why

### 1. Quip's Own Chain Is Not EVM-Compatible
- **Expected:** Deploy Solidity contract to Quip testnet (chain ID 20033)
- **Reality:** Quip testnet is Substrate-based with `pallet-revive` (Wasm contracts)
- **Evidence:** runtime/Cargo.toml has no `pallet-evm` or Frontier dependency;
  node/src/rpc.rs exposes only Substrate RPC methods, no `eth_*` endpoints
- **Impact:** Hardhat/Foundry cannot deploy to Quip's chain

### 2. Bootnode RPC Unreachable
- **Expected:** Connect to bootnode-1.aglais.quip.network:9944
- **Reality:** WSS handshake timeout, WS/HTTPS connection reset
- **Evidence:** DNS resolves to 45.27.50.228 but port 9944 times out
- **Impact:** Cannot interact with Quip testnet even for Substrate-native operations

### 3. Sepolia Faucets Require Mainnet ETH
- **Alchemy faucet:** Requires ≥0.001 ETH on mainnet + transaction history
- **QuickNode faucet:** Requires mainnet balance (detected 0 balance)
- **PoW faucet (pk910.de):** Cloudflare Turnstile blocks headless browser
- **Chainstack faucet:** Returns "Method Not Allowed" to POST requests
- **Impact:** Cannot fund throwaway wallet for Sepolia deployment

### 4. Hardhat 3.x Compatibility Issues
- **Issue:** Hardhat 3 requires ESM (`"type": "module"` in package.json)
- **Issue:** `@nomicfoundation/hardhat-toolbox` latest version incompatible with HH3
- **Workaround:** Downgraded to Hardhat 2.22 with toolbox v5

## What Would Have Made This Easier

### Quip Network Documentation
1. **Clear EVM compatibility statement:** The docs never explicitly say whether
   Solidity can be deployed on Quip's chain. A developer landing on quip.network
   would reasonably assume EVM support based on MetaMask wallet integration
   and the `pallet-evm-chain-id` pallet name.

2. **Public RPC endpoint list:** The docs mention bootnodes but don't provide
   a public HTTPS RPC endpoint. All Substrate chains should publish at least
   one public RPC URL for developer access.

3. **Faucet for testnet tokens:** No documented way to get AGLS tokens without
   running a full node. Most testnet chains provide a faucet.

4. **Contract deployment guide:** The ethereum-sdk README shows how to deploy
   to external chains but there's no guide for deploying contracts on Quip's
   own chain (using pallet-revive).

5. **Block explorer:** No public block explorer for the testnet. The docs
   mention Polkadot.js Apps but it requires a working RPC connection.

### Tooling
1. **Sepolia faucet API:** All faucets require mainnet ETH or browser interaction.
   A simple POST endpoint with a CAPTCHA would enable CLI-based funding.

2. **Hardhat 3 compatibility:** The toolbox package versions are confusing;
   clear migration docs or version pinning would help.

### Architecture Clarity
1. **Two-chain architecture:** Quip has both a Substrate chain (for compute
   consensus) and deploys EVM contracts on external chains. This dual nature
   is not clearly communicated in the developer docs.

2. **pallet-revive vs pallet-evm:** The name `pallet-evm-chain-id` is misleading.
   It only stores a chain ID number; it does NOT enable EVM execution.
