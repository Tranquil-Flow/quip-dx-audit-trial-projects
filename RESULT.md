# RESULT — Quip Network PQ Wallet CLI Prototype

## Status

| Component | Status | Evidence |
|---|---|---|
| Research Quip Network (docs, SDKs, networks) | WORKING | DEVLOG.md |
| CLI: create Quip PQ smart account | WORKING (devnet-blocked, see below) | localnet run with real devnet program |
| CLI: fund account | WORKING locally / BLOCKED on devnet faucet quota | see Funding |
| WOTS+ transfer signed with Quip's PQ signing SDK | WORKING | tx logs "WOTS+ Verification result: true" |
| Submit transfer | WORKING | tx signatures below |
| Key rotation (one-time WOTS+ keys) | WORKING | 2 sequential transfers, seeds rotated |
| Block explorer link | PARTIAL | localnet txs are not on a public explorer; devnet run blocked by faucet |

**Overall: PARTIAL** — the entire Quip PQ-wallet flow is implemented and proven
end-to-end with Quip's real on-chain program (cloned from devnet), but the final
public-devnet run was blocked by Solana's devnet faucet rate-limiting our
network's egress IP. Not a Quip bug — a Solana faucet quota issue.

## What was built

`src/cli.mjs` → `dist/quipwallet.cjs` (esbuild bundle; the SDK ships extensionless
ESM imports that Node cannot resolve natively — see DEVLOG).

Commands: generate | create [sol] | fund | balance | transfer <to> [sol] | show

Uses ONLY Quip's own SDKs:
- @quip.network/solana-sdk@0.0.1 (smart-wallet client; program
  Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj, factory A9pdWuTNwG3Br6E8yqEJFWis3PgjJJqR471EEUa6uUV4
  initialized on devnet with creation fee 0.001 SOL)
- @quip.network/hashsigs@0.1.0 (WOTS+/Keccak-256 signing)

## How to run

```bash
cd /private/tmp/devtrials6/m1-glm-5.2
npm install && npm run build

# LIVE DEVNET (works when the faucet isn't quota-blocking your IP):
node dist/quipwallet.cjs generate
node dist/quipwallet.cjs create 0.05
node dist/quipwallet.cjs transfer <recipient> 0.01
node dist/quipwallet.cjs show
# then open the printed explorer.solana.com links (cluster=devnet)

# LOCAL REPRODUCIBLE RUN (real Quip program cloned from devnet):
solana-test-validator --reset --url https://api.devnet.solana.com \
  --clone-upgradeable-program Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj \
  --clone A9pdWuTNwG3Br6E8yqEJFWis3PgjJJqR471EEUa6uUV4 --ledger .validator-ledger &
QUIP_CLUSTER=custom QUIP_KEYS_DIR=keys-local QUIP_RPC_URL=http://127.0.0.1:8899 \
  node dist/quipwallet.cjs generate
QUIP_CLUSTER=custom QUIP_KEYS_DIR=keys-local QUIP_RPC_URL=http://127.0.0.1:8899 \
  node dist/quipwallet.cjs create 0.05
QUIP_CLUSTER=custom QUIP_KEYS_DIR=keys-local QUIP_RPC_URL=http://127.0.0.1:8899 \
  node dist/quipwallet.cjs transfer 2zwLT7t3SGnbjEUxo35zvisqRHd1Dwvn6BxPhMAyrXwn 0.005
# QUIP_CLUSTER=custom makes explorer links use cluster=custom&customUrl=http://127.0.0.1:8899
# so the local txs are viewable in the real explorer.solana.com UI while the validator runs.
```

## Evidence (localnet run with the real devnet program)

- wallet PDA (PQ smart account): DnHfNshVhvD1ceH6K8evAQivnUivzxv1j5ZAsSbBUn5N
- payer: CyLes6PF6GunW2r4KHfNqtuM95QQ4JWDS58PpuQMMG2h
- create tx: 5VHVMCprv2AgVhpExCACJWir (deposit_to_winternitz, 0.05 SOL)
- transfer #1 tx: 2T6f5rZzWz3wonkwjPt7KKpueG5Y4gouWgzpRJsNfJzfmt8gfHDWauAjcpoHN5ivPQ4MmzkRhQRGYBX155nM4tqZ
  (3 store_signature chunk txs + final transfer_with_winternitz; amount 0.01 SOL)
- transfer #2 tx: 2UJz6M6af3LEd28aH4ZpCRu6uBsCCBp8gzQ27VfUzepoPQRWeB8yHrcxoTGsQDq7pr3z5X5GE7SxSXtzaC7ijwne
  (0.005 SOL, proves key rotation)
- On-chain program logs from transfer #1:
  "Instruction: TransferWithWinternitz", "Signature data length: 2144",
  "Signature elements count: 67", "WOTS+ Verification result: true",
  "Deducted 10000000 lamports from wallet", "Added 10000000 lamports to recipient",
  "Transfer completed successfully", consumed 301247 of 399850 CU.
- PQ key rotated after each transfer (seed ba426a9d... → 1ea7c18a... → 4a8ced1f...), tx_count 0→1→2.
- Signer re-validated after rotation via deterministic recovery (quantumSecret || vaultId || publicSeed).
- Security: replaying a transfer signed with a ROTATED-AWAY key is rejected (final tx failed
  preflight simulation with custom program error 0x1771 — signature verified against the CURRENT
  on-chain pq_owner, which no longer matches the old key; wallet state unchanged). One-time-key
  policy is enforced by the program, not just a client convention.
- create tx: 5VHVMCprv2AgVhpExCACJWirk4GNcx6vFhp1cfNje8TJhzxp649SJiWwgYXjCTgK2f8vB2forcTXMYvRh5NHkp3f
  ("Instruction: DepositToWinternitz", 15542 CU, err None).

## Funding (devnet) — what happened

- Solana devnet RPC faucet: 429 "airdrop limit today or faucet dry". Diagnosed:
  faucet wallet 9B5XszUGdMaxCZ7uSQhPzdks5ZQSmWxrmzCSvtJ6Ns6g holds ~10.1M SOL, so it is a
  per-IP daily quota — our egress IP (64.130.42.134, shared) is exhausted.
- Tried and failed (all recorded in DEVLOG): solana CLI airdrop, tiny amounts, IPv6
  (same IP), faucet.solana.com (Cloudflare Turnstile + GitHub), devnetfaucet.org
  (GitHub OAuth), OnFinality public RPC (global 1 rps, saturated), Ankr/Chainstack/
  Lava/Alchemy/Helius (API keys), DRPC (no solana on free plan), publicnode
  (devnet 404), triton/extrnode (DNS dead), solfaucet.com, api.testnet.solana.com
  (Internal error; Quip program isn't deployed on testnet anyway).
- Ellipsis Labs PoW faucet (devnet-pow): the v0.1.4 Rust binary cannot parse
  modern devnet RPC responses; I ported the miner to Node (src/mine-pow.mjs).
  Mining works (difficulty-2 keys in seconds), but all faucet sources are drained
  except one paying 100 lamports/claim, and a claim still needs a funded fee
  payer — chicken-and-egg.
- A background poller kept retrying the RPC faucet; all 20 attempts over ~20 min hit the same
  per-IP 429 (16:53-17:14 UTC). The quota did not free within this session — the devnet rerun
  stays documented as a one-command follow-up (scripts/devnet-run.sh) once the IP quota resets.
- Quip's own "faucet" repo serves their Substrate compute-layer testnet only —
  no help for the Solana asset layer.

## What did NOT work / vendor-fit problems found

1. Node usability of @quip.network/solana-sdk: extensionless ESM imports, no
   "type" field, no docs — must be bundled; API only learnable by reading dist
   source. (Worked around with esbuild.)
2. Quip has THREE asset-layer implementations (Solana/Anchor, EVM/Hardhat,
   Arch/Bitcoin) in two GitHub orgs (quip-network private, quipnetwork public)
   with NO cross-docs; the "testnet" in Quip's marketing = their Substrate
   compute chain, NOT where asset-layer smart accounts live. Their docs
   (quip.gitbook.io/docs) 404 on the root path we were given.
3. arch-sdk README admits TS-minted WOTS+ keys cannot be verified on-chain
   (hashsigs-rs vs hashsigs-ts derive private keys differently) — requires a
   Rust CLI for keygen. On Solana, TS keygen verified fine (proven by logs).
4. factory transferFee (0.0001 SOL) was NOT deducted on transfer: recipient got
   exactly the amount, wallet lost exactly the amount. Fee config exists but
   isn't wired into transfer_with_winternitz (or is charged elsewhere) —
   undocumented.
5. Wallet balance after create = deposit + ~0.00201144 SOL extra — composition
   unexplained (rent is ~0.00112 for 161 bytes); program source is not public.
6. SDK hardcodes 400k CU limit; actual WOTS+ verification consumes ~301k — fine
   today, but no headroom knob in the SDK.
7. Solana ecosystem funding reality: the RPC faucet is quota'd per IP, the web
   faucet needs GitHub+captcha, PoW faucet is drained, RPC providers need API
   keys. A CI/cloud IP without credentials cannot get devnet SOL in 2026.

## What would have made this easier (vendor side)

- Publish the quip-anchor program source + a devnet program "ready to use"
  note, plus a JS API reference (the npm README is only the Anchor build guide).
- Fix package exports ("type": "module" + explicit exports map) so the SDK
  runs in Node without a bundler.
- Document the actual deposit/fee math (where creationFee/transferFee are
  charged, what the post-create balance includes).
- Ship a Quip-run devnet faucet for the asset layer (their faucet only covers
  the compute chain), or at least document which Solana faucets work.
- Keep quip.gitbook.io/docs working (404 at time of writing) and cross-link
  the Solana/EVM/Arch implementations.

Keys: fresh throwaway keypairs in ./keys (devnet) and ./keys-local (localnet).
No existing wallets were touched; no mainnet; nothing posted publicly.
