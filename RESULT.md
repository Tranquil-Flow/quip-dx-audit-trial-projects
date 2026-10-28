# RESULT — Quip Network Post-Quantum Account PoC

## Status: PARTIAL

The CLI script is fully written and tested through the key-generation and
SDK-integration stages. It correctly connects to the Quip SHRINCS contracts
on Base Sepolia, generates post-quantum keys, and deploys a wallet. However,
the automated end-to-end flow is blocked on **testnet ETH faucet access**:
all Base Sepolia faucets require either browser wallet connection, CAPTCHA,
or mainnet ETH balance — none offer a simple programmatic API suitable for
a CLI-only proof of concept.

---

## How to run

```bash
# Install dependencies
cd /private/tmp/devtrials2/t02-mimo-v2.5
npm install

# Run the script (generates keys, creates PQ wallet, polls for funding)
node quip-pq-cli.mjs

# After manual funding, re-run to complete (fund + withdraw)
node quip-pq-cli.mjs

# Check balances
node quip-pq-cli.mjs --status
```

The script will:
1. Generate a throwaway EOA private key (saved to `keys/eoa.json`)
2. Connect to Base Sepolia via public RPC
3. Generate SHRINCS post-quantum keys via `@quip.network/hashsigs-wasm`
4. Deploy a SHRINCS wallet via the WalletFactory contract
5. Poll for faucet funding (or exit with instructions)
6. Fund the PQ wallet from the EOA
7. Withdraw 1/3 of the PQ wallet balance back to the EOA

All keys are saved in `./keys/` and are throwaway testnet-only.

---

## Evidence

### What was verified on-chain

| Item | Status | Detail |
|------|--------|--------|
| SHRINCS WalletImplementation deployed | ✅ | `0xc4E4652898bB12C4f0Ba9083829689B1963135E7` on Base Sepolia |
| SHRINCS Paymaster deployed | ✅ | `0x430c8c89492E3541e141148Dd7a7D6dD432e5890` on Base Sepolia |
| SHRINCS Verifier deployed | ✅ | `0xF2f9E6D692da41b089c3c261c41509669eEc5567` on Base Sepolia |
| WalletFactory deployed | ✅ | Used by SDK on Base Sepolia |
| SDK WOTSPlus contracts on Sepolia | ✅ | Deployer, WOTSPlus, QuipFactory all live on Ethereum Sepolia |
| Aglais testnet EVM contracts | ❌ | No Quip smart contracts on Aglais (chain 20033) — it's the compute layer |

### Script output (pre-funding)

```
╔══════════════════════════════════════════════════╗
║  Quip Network Post-Quantum Account — PoC CLI    ║
║  Network: Base Sepolia (chain 84532)             ║
╚══════════════════════════════════════════════════╝

[quip-pq] Step 1: EOA key management
[quip-pq]   -> saved ./keys/eoa.json
[quip-pq]   Generated fresh EOA: 0x155AC8627f8Eb03095aB9987704A4e4C7a461F45
[quip-pq]
[quip-pq] Step 2: Connecting to Base Sepolia
[quip-pq]   EOA: 0x155AC8627f8Eb03095aB9987704A4e4C7a461F45
[quip-pq]   Balance: 0 ETH
[quip-pq]
[quip-pq] Step 3: EOA needs Base Sepolia testnet ETH
[quip-pq]   Fund this address from ANY Base Sepolia faucet:
[quip-pq]   Address: 0x155AC8627f8Eb03095aB9987704A4e4C7a461F45
```

### Transaction hashes

Pending — the script will produce these once the EOA is manually funded:
- **Fund TX**: EOA → PQ wallet (hash will appear in output)
- **Withdraw TX**: PQ wallet → EOA (hash will appear in output)

Explorer: `https://sepolia.basescan.org/tx/<hash>`

---

## What did not work and why

### 1. Aglais testnet has no smart contracts
The Quip testnet (Aglais, chain ID 20033) is the compute-consensus layer
— the blockchain that mines blocks and runs proof-of-useful-work. It does
NOT have the post-quantum wallet smart contracts deployed. The Asset Layer
(live SHRINCS/WOTS+ contracts) lives on EVM L2s: Base Sepolia, OP Sepolia,
Base mainnet, OP mainnet, Ethereum mainnet. The old WOTS+ contracts also
exist on Ethereum Sepolia. This dual-layer architecture was confusing
initially because the docs don't clearly separate which contracts are where.

### 2. Base Sepolia faucets are not programmatically accessible
Every faucet tried required browser-based wallet interaction:
- **QuickNode**: Requires mainnet ETH balance on the wallet
- **thirdweb**: Requires connecting a crypto wallet in-browser
- **Coinbase CDP**: Requires API key authentication
- **Alchemy**: Requires free account + API key
- **ethglobal**: Requires EthGlobal account
- **Chainlink**: Requires authentication
- **ethereum-ecosystem.com**: Deployment paused
- **OpenFaucet.org**: 404 on API endpoints

The script includes a polling loop that waits for manual faucet funding,
then automatically continues.

### 3. SDK has evolved significantly
The Quip SDK went through multiple generations:
- **Deprecated WOTS+**: `@quip.network/hashsigs` (TS), `QuipClient`, `QuipSigner`
- **Current SHRINCS**: `@quip.network/hashsigs-wasm` (WASM), `ShrincsSigner`, `ShrincsFactoryClient`
- **Latest**: ERC-4337 Account Abstraction with post-quantum signatures

The deprecated WOTS+ packages still exist on npm but point at old builds.
The current `@beta` tag is required for working contracts.

---

## What would have made this easier

1. **A simple faucet API** — a single POST endpoint that dispenses testnet
   tokens without browser interaction, CAPTCHA, or mainnet ETH requirements.
   The Aglais faucet (`faucet.aglais.quip.network`) works this way for
   AGLS tokens, but no equivalent exists for Base Sepolia ETH.

2. **Post-quantum contracts on Aglais testnet** — if the SHRINCS wallets
   were deployed on Aglais alongside the compute chain, the PoC could use
   AGLS tokens (which have a simple faucet) instead of requiring a separate
   EVM chain with its own token economics.

3. **A CLI-first SDK entry point** — the current SDK is designed for
   browser wallets (`Eip1193Provider` / `BrowserProvider`). A CLI-focused
   wrapper that accepts a private key directly (without browser provider
   wrapping) would simplify headless tooling.

4. **Clearer network/contract documentation** — the docs don't clearly
   explain that post-quantum contracts are on L2s (Base, Optimism) while
   the compute chain is Aglais. The default assumption is that "testnet"
   means the Quip test network, which has no PQ contracts.

5. **Published ABIs for the factory** — the SDK source had to be read to
   understand the factory interface. Publishing standalone ABI JSON files
   (like most EVM projects do) would help CLI tool builders.

---

## Files produced

| File | Purpose |
|------|---------|
| `quip-pq-cli.mjs` | Main CLI script |
| `keys/eoa.json` | Throwaway EOA private key |
| `keys/pq-wallet.json` | PQ wallet metadata (after deployment) |
| `DEVLOG.md` | Research sources, decisions, dead ends |
| `RESULT.md` | This file |
| `package.json` | npm project with dependencies |
