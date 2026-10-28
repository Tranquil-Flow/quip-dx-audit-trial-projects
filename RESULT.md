# RESULT: Quip PQ wallet CLI on Solana devnet

Overall: **PARTIAL** (code written; on-chain create/transfer not executed because devnet SOL could not be obtained)

| Component | Status | Notes |
|---|---|---|
| SDK discovery/install (`@quip.network/solana-sdk@0.0.1`) | WORKING | needs `tsx` (extensionless ESM imports break plain Node) |
| PQ scheme | WORKING (offline) | Only WOTS+ (Keccak256) is offered; no newer scheme found. `src/selftest.mjs` produced a 2144-byte WOTS+ signature |
| Key generation (`init`) | WORKING | payer keypair, PQ secret, vault id in ./keys (throwaway) |
| Devnet program/factory reachable (`factory`) | WORKING | program `Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj`; factory admin D6opYbbZ5v4aP6ofkNWzm6QNH9dZxEvaGymYebFhfUNF, creationFee 1000000, transferFee 100000, totalWallets 2 |
| Fund (`fund`) | BLOCKED | devnet airdrop 429 for ~12 min of retries; other RPCs need API keys; faucet.solana.com needs GitHub login |
| Create wallet (`create`) | BLOCKED (untested) | uses QuipClient.createWallet |
| PQ-signed transfer (`send`) | BLOCKED (untested) | uses QuipWalletClient.transferWithWotsChunked (signature stored in chunks, then execute tx) |

## Run
```
npm install
export NODE_NO_WARNINGS=1
npx tsx src/cli.mjs init          # already done; keys in ./keys
npx tsx src/cli.mjs fund 1        # needs devnet faucet available (or send devnet SOL to payer manually)
npx tsx src/cli.mjs create 0.1
npx tsx src/cli.mjs info
npx tsx src/cli.mjs send <recipient> 0.01
```
If airdrop is limited, transfer ~0.2 devnet SOL to the payer address below by other means.

## Evidence
- Payer address (needs funding): FErT2xaG8RTB4VQLYA9JKK32LjLp4UcdL9MAn82rS9Xi
- No tx hashes: no transaction was sent.
- Faucet error: `429 You've either reached your airdrop limit today or the airdrop faucet has run dry`.

## What did not work
- Funding (above). No workaround without external accounts.
- Docs: quip.gitbook.io quickstart URL 404; npm page 403 to fetcher; no public source repo for the Solana SDK found.

## What would have helped from the vendor
- SDK README describing the SDK usage (current one is a program-build README) with a create/transfer example and the devnet factory status.
- Ship ESM with `.js` extensions (or CJS) so Node runs it without tsx.
- Document WalletAdapter requirements (a keypair adapter helper for CLI/Node use).
- A public repo link that resolves (npm homepage quip-anchor 404s), and a Solana-devnet faucet/funding path.
- State clearly which PQ scheme is recommended (SDK only offers WOTS+, one-time keys rotated on each tx).
