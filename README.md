# Quip Network PQ Wallet CLI — prototype

Post-quantum smart account on the Quip asset layer (Solana devnet deployment),
using Quip's own SDKs:
- @quip.network/solana-sdk@0.0.1 (WOTS+ smart wallet program client; program
  Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj, factory initialized on devnet)
- @quip.network/hashsigs@0.1.0 (WOTS+ signatures, Keccak-256)

## Setup
```bash
npm install
npm run build          # esbuild bundle (SDK ships extensionless ESM; see DEVLOG)
```

## Usage
```bash
node dist/quipwallet.cjs generate                   # fresh throwaway keys -> ./keys
node dist/quipwallet.cjs create 0.05                # airdrop (if needed) + create PQ smart account
node dist/quipwallet.cjs balance                    # balances + validate PQ signer on-chain
node dist/quipwallet.cjs transfer <recipient> 0.01  # WOTS+-signed transfer, key rotates
node dist/quipwallet.cjs show                       # addresses + explorer links
node dist/quipwallet.cjs fund payer 1               # extra faucet SOL for the fee payer
node dist/quipwallet.cjs fund <wallet-pda> 0.05     # top up the PQ wallet
```

Env: QUIP_RPC_URL (default https://api.devnet.solana.com), QUIP_KEYS_DIR (default ./keys).

## How funding works
Devnet faucet (requestAirdrop) is frequently drained. Fallback: Ellipsis Labs
proof-of-work faucet (`cargo install devnet-pow; devnet-pow mine ...`) — see
scripts/fund-devnet-pow.sh.

## Key safety
- keys/ holds a payer keypair (classical ed25519, pays tx fees), a 32-byte
  quantum secret, and a 32-byte vault id. All generated fresh for this run.
- WOTS+ keys are ONE-TIME: each transfer rotates the on-chain PQ key. The
  QuipSigner recovers the current key deterministically from
  keccak(quantumSecret || vaultId || publicSeed).

See DEVLOG.md for the full trail and RESULT.md for status/evidence.
