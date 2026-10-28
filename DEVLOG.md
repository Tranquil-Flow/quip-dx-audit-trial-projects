# DEVLOG — Quip Network PQ Wallet CLI Prototype

Task: create a Quip post-quantum smart account, fund it on testnet, sign a
transfer with Quip's PQ signing SDK, submit it, show the result on a block
explorer.

## Sources consulted (in order)
1. https://quip.network/ — main site (web_search)
2. https://quip.network/blog/testnet-is-live — testnet announcement (web_extract)
3. https://www.npmjs.com/package/@quip.network/solana-sdk — package page (npmjs.com blocked direct fetch; used registry API instead)
4. https://registry.npmjs.org/-/v1/search?text=scope:quip.network — npm scope inventory
5. https://api.github.com/orgs/quipnetwork/repos — GitHub org (quipnetwork)
6. https://registry.npmjs.org/@quip.network/solana-sdk — registry metadata + README
7. https://registry.npmjs.org/@quip.network/ethereum-sdk — README (raw JSON had control chars; read via GitHub instead)
8. https://api.github.com/repos/quipnetwork/ethereum-sdk/readme
9. https://api.github.com/repos/quipnetwork/arch-sdk/readme
10. https://registry.npmjs.org/@quip.network/arch-sdk — full README
11. https://api.github.com/repos/quipnetwork/hashsigs-ts/readme
12. https://api.devnet.solana.com — RPC check that program Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj is deployed on devnet (executable, BPFLoaderUpgradeab1e...)
13. Extracted @quip.network/solana-sdk@0.0.1 tarball into .inspect/ and read dist/*.js source (constants, addresses, winternitz, factory, wallet, solana, storeSignature, storeOpdata) + quip_program.json IDL

## Key decisions / guesses
- "Quip Network" = Postquant Labs' Quip Network. Asset layer = PQ smart
  wallets deployed as programs/contracts on EXISTING chains (Solana, EVM,
  Arch/Bitcoin). Their own compute-layer "testnet" is a Substrate fork for
  quantum compute, NOT where asset-layer smart accounts live.
- Chose the SOLANA path: @quip.network/solana-sdk@0.0.1 (public devnet
  program Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj), no API keys needed,
  devnet faucet via RPC airdrop. EVM path needs Alchemy keys + Sepolia faucet
  (hard without social login); Arch path needs BIP-322 signer + Arch faucet.
- "testnet" interpreted as Solana devnet (Quip docs call devnet their test
  deployment; scripts only support devnet/mainnet for this program).
- npmjs.com page fetch failed (bot protection) → used registry.npmjs.org JSON + tarball instead.
- quip-anchor repo on GitHub (github.com/quip-network/quip-anchor) returned
  404 via API — org "quip-network" may be private/renamed; the npm tarball is
  the only source. quipnetwork org (public) has the other repos.
- Two GitHub orgs exist: quip-network (solana/anchor, quip-arch per npm
  metadata) and quipnetwork (ethereum-sdk, arch-sdk, hashsigs-*, miner stack).
- SDK README on npm is the Anchor build guide; the actual JS API had to be
  reverse-read from dist/*.js source (no API docs anywhere).

## Commands / findings
- npm init + npm install @quip.network/solana-sdk @quip.network/hashsigs @solana/web3.js (esbuild as devDep)
- ERROR: SDK dist uses extensionless ESM imports (`import ... from "./constants"`) with no
  "type" field in package.json → Node can't run it directly. Workaround: bundle CLI with esbuild (format=cjs).
  Also web3.js CJS build does dynamic require("buffer") → ESM bundle fails; CJS bundle + no top-level await works.
- ERROR: "bad secret key size" — my bug (passed whole JSON instead of .secretKey to Uint8Array.from). Fixed.
- devnet RPC probe: factory PDA A9pdWuTNwG3Br6E8yqEJFWis3PgjJJqR471EEUa6uUV4 EXISTS,
  admin D6opYbbZ5v4aP6ofkNWzm6QNH9dZxEvaGymYebFhfUNF, creationFee 0.001 SOL, transferFee 0.0001 SOL,
  executeFee 0.0001 SOL, totalWallets=2. Program executable on devnet. => Quip devnet env is live.
- Testnet cluster (api.testnet.solana.com): Quip program NOT deployed there. Only devnet (+mainnet).
- FUNDING ROADBLOCK: api.devnet.solana.com requestAirdrop → 429 "faucet has run dry" / rate limit.
  solana CLI 4.2.2 airdrop → same rate limit. faucet.solana.com needs captcha + GitHub eligibility (no account available).
  Ankr/Chainstack/Lava/Alchemy-demo/OnFinality public RPCs: need API keys or 429. Quip's own faucet repo is for
  their Substrate compute chain only — no help for the Solana asset layer.
- SOLUTION: proof-of-work faucet by Ellipsis Labs (github.com/jarry-xiao/proof-of-work-faucet,
  listed in official Solana cookbook): `cargo install devnet-pow`; `devnet-pow mine` solves PoW
  (difficulty 3-5, trivial on Apple Silicon) and pays devnet SOL from on-chain faucets (one had 10305 SOL).
  Installed Solana CLI (Agave 4.2.2) via release.anza.xyz install script.
- Arch-sdk README note (backup path B): on Arch, WOTS+ keys minted by TS hashsigs CANNOT be verified
  on-chain (Rust verifier derives private key differently: keccak256(seed) vs keccak256(seed||pubseed)) —
  they require `quip-cli wots-gen` (Rust). Another vendor-pieces-don't-interlock data point.
  Arch path also needs BIP-322 signer (bip322-js) + Arch faucet — not attempted, kept as fallback.
- EVM path (@quip.network/ethereum-sdk): needs Alchemy keys + Sepolia/Base-Sepolia faucets with social
  login — not feasible here. Recorded for the report.

## Plan (Solana devnet)
1. generate throwaway keys in ./keys (payer keypair, 32B quantum secret, 32B vault id) — DONE
2. airdrop SOL to payer via devnet-pow PoW faucet
3. QuipClient.createWallet(vaultId, signer, deposit) → deposit_to_winternitz → PDA smart account
4. QuipWalletClient.transferWithWinternitz(to, amount) → chunked WOTS+ signature upload (store_signature)
   + final transfer_with_winternitz tx, PQ key rotates
5. explorer.solana.com links for wallet PDA + tx
CLI built at src/cli.mjs (bundled to dist/quipwallet.cjs with esbuild — required, see error above).

## Funding saga (long — honest account)
- requestAirdrop 429 on api.devnet.solana.com; faucet wallet 9B5XszUGdMaxCZ7uSQhPzdks5ZQSmWxrmzCSvtJ6Ns6g
  has ~10.1M SOL (NOT dry) → the 429 is a per-IP daily quota; our egress IP is exhausted (shared/cloud IP).
- Tried: solana CLI airdrop (same), tiny amounts (same), faucet.solana.com /api/request (needs GitHub OAuth —
  backend repo solana-developers/solana-devnet-faucet-backend confirms GitHub eligibility gating),
  devnetfaucet.org (NextAuth/GitHub), OnFinality public RPC (global 1 req/s — saturated, 429s),
  Ankr/Chainstack/Lava/Alchemy-demo/Helius (API keys), DRPC free plan (no solana), publicnode (devnet 404),
  triton/extrnode (DNS dead), solfaucet.com (proxies same dry quota), api.testnet.solana.com (Internal error;
  Quip program not deployed on testnet anyway), Quip account.quip.network app (thirdweb UI, no faucet backend),
  Quip faucet repo (Substrate compute chain only).
- devnet-pow (Ellipsis PoW faucet): v0.1.4 binary can't parse modern devnet RPC responses
  ("invalid type: map, expected a sequence" — old solana-client 1.18). Ported the miner to Node
  (src/mine-pow.mjs) using the on-chain program source (PoWSNH2hEZogtCg1Zgm51FnkmJperzYDgPK4fvs8taL).
  Mining works (keys with leading-A base58 prefixes found in seconds), BUT the claim tx needs a funded
  fee payer and all PoW faucet sources are drained except one paying 100 lamports — useless.
- Fallback that WORKED: local solana-test-validator with the REAL Quip program cloned from devnet
  (--clone-upgradeable-program Quipr1... --clone factory). Unlimited local airdrops.
  Background poller on the devnet faucet still running for a live-devnet rerun if the quota frees.
- faucet.solana.com frontend JS (read from their _next chunks): POST /api/request payload is
  {amount, walletAddress, cloudflareCallback, network} — cloudflareCallback = Cloudflare Turnstile token
  (browser/behavioral captcha) → not automatable without a browser session.
  The page also just recommends the PoW faucet as an alternative. GitHubConnectForm present (OAuth flow).
- IPv6: host has IPv6 but RPC resolves to the same ::ffff:64.130.42.134 → same quota pool.
- Poller bug fixed: first version grepped the "Requesting airdrop" line (false positive);
  now checks actual balance > 0. solana CLI also needs a plain-array keypair file
  (keys/payer-cli.json), not my {secretKey,...} object.
- Explorer: QUIP_CLUSTER=custom makes the CLI emit explorer links with
  cluster=custom&customUrl=<rpc> → local validator txs viewable in the real explorer.solana.com UI.

## Local-validator end-to-end run (REAL Quip program code from devnet, cloned)
- generate (keys-local): payer CyLes6PF6GunW2r4KHfNqtuM95QQ4JWDS58PpuQMMG2h
- create 0.05 → deposit_to_winternitz OK
  wallet PDA: DnHfNshVhvD1ceH6K8evAQivnUivzxv1j5ZAsSbBUn5N
  balance after create: 0.05201144 SOL (0.05 deposit + ~0.00201144 extra — rent/fee composition unclear,
  program source is private; observed, not explained)
- transfer 0.01 → recipient 2zwLT7t3SGnbjEUxo35zvisqRHd1Dwvn6BxPhMAyrXwn
  final tx: 2T6f5rZzWz3wonkwjPt7KKpueG5Y4gouWgzpRJsNfJzfmt8gfHDWauAjcpoHN5ivPQ4MmzkRhQRGYBX155nM4tqZ
  on-chain logs show: "WOTS+ Verification result: true", 67 sig elements, 2144 bytes, message len 168,
  "Deducted 10000000 lamports from wallet", "Added 10000000 lamports to recipient",
  consumed 301247 of 399850 CU → SDK's hardcoded 400k CU limit is justified but tight.
  wallet 0.05201144 → 0.04201144; recipient 0 → 0.01 EXACT.
  NOTE: factory transferFee=0.0001 SOL was NOT deducted (recipient got full amount, wallet lost exactly
  the amount) — fee not wired into this path, despite factory config. Discrepancy to report.
- second transfer 0.005 OK (2UJz6M6af3LEd28aH4ZpCRu6uBsCCBp8gzQ27VfUzepoPQRWeB8yHrcxoTGsQDq7pr3z5X5GE7SxSXtzaC7ijwne):
  key rotated again (seed 4a8ced1f...), tx_count=2, `balance` command re-validates signer via
  deterministic recovery from (quantumSecret, vaultId, publicSeed) — OK.
- selftest (src/selftest.mjs): local WOTS+ sign/verify round-trip OK (67×32B signature).
- key rotation + one-time-key protocol: WORKS (each transfer signs with current key, rotates to fresh key).
- NEGATIVE TEST (src/negative-old-key.mjs): replayed a transfer signed with the ROTATED-AWAY key
  (seed ba426a9d...) against the wallet whose on-chain key is now 4a8ced1f... → final tx rejected in
  preflight simulation with custom program error 0x1771 (log shows the program verifying against the
  CURRENT stored key), wallet state unchanged.
  => one-time-key enforcement is real, on-chain, not just a client-side convention.
- create tx full sig: 5VHVMCprv2AgVhpExCACJWirk4GNcx6vFhp1cfNje8TJhzxp649SJiWwgYXjCTgK2f8vB2forcTXMYvRh5NHkp3f
  logs: "Instruction: DepositToWinternitz", 15542 CU, err None.
- devnet faucet poller: 20/20 attempts 429 (16:53-17:14 UTC) — per-IP quota held for the whole
  session. Devnet rerun documented as scripts/devnet-run.sh one-command follow-up.


