# DEVLOG
Sources consulted (in order):
1. WebSearch "Quip Network Solana SDK post-quantum wallet" (generic news; found WOTS+ mention)
2. WebSearch "quip.network docs Solana SDK github quip-protocol" -> found npm @quip.network/solana-sdk, quip.gitbook.io
3. npmjs.com/package/@quip.network/solana-sdk via WebFetch -> 403
4. quip.gitbook.io/docs/getting-started/quickstart via WebFetch -> 404 (dead end)
5. `npm view @quip.network/solana-sdk` -> only version 0.0.1 (AGPL, published ~1yr ago); README in installed package (node_modules)
6. Read SDK .d.ts files in node_modules (source instead of docs)

Commands: npm init; npm i @quip.network/solana-sdk (ok). Note: `npm view @quip.network/solana` 404 (guessed name wrong).
Findings: SDK exposes only WOTS+ (Keccak256) via QuipSigner; program Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj. README is a program-dev README (anchor build), not SDK usage docs.
7. GitHub API (curl) listing org QuipNetwork repos -> no public Solana SDK/quip-anchor repo found (github.com/quip-network/quip-anchor from npm homepage: API 404). QuipNetwork/faucet README read: it's a Substrate faucet, irrelevant to Solana.
8. Scheme choice: SDK offers only WOTS+ (Keccak256) — no alternative/"newer" scheme visible, so used it (no guess between schemes needed). Could not find any docs stating a "recommended" scheme.

Errors / deviations:
- `node src/cli.mjs` -> ERR_MODULE_NOT_FOUND: SDK dist/index.js uses extensionless ESM imports ("./constants"). Workaround: run via `tsx` (npm i -D tsx). Read source instead of docs.
- SDK requires a wallet-adapter object; wrote a Keypair-backed shim (publicKey, signTransaction, signAllTransactions) — guessed from reading sendAndConfirmTransactions in solana.js.
- Read devnet factory via `factory` command: initialized (creationFee 0.001 SOL, transferFee 0.0001 SOL, totalWallets 2), so program is live on devnet at Quipr1sgz...
- Airdrop: `requestAirdrop` via api.devnet.solana.com -> first "Internal error", then 429 "airdrop limit reached or faucet dry" for 2, 1, 0.5, 0.1 SOL; retried ~15 times over ~12 min, all 429. Tried ankr (API key required), helius (Unauthorized), alchemy (empty). faucet.solana.com/api/request -> "GitHub authentication required" (did not sign in; out of scope / no accounts). BLOCKED on funding.
- Consequently `create` and `send` were written but never executed against devnet.
- Only offline check: src/selftest.mjs signs with WOTS+ (67x32 = 2144-byte signature).
- Unverified guess: `create` uses initialDeposit as lamports; `send` uses transferWithWotsChunked (transferWithWinternitz calls it internally per wallet.js line ~95).
