# m1-b

- **Round:** Round 2
- **Model:** DeepSeek V4 Pro
- **Task:** same brief, built for Solana
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| same brief, built for Solana | DeepSeek V4 Pro | solana-sdk (Quip PQ smart wallet, WOTS+) | Partly working: create and transfer ran on a local validator cloned from devnet, on the previous-generation WOTS+ scheme | ~54 min | Solana's devnet faucet rate-limited funding, and Quip's faucet covers only Aglais. The only Solana SDK line is WOTS+. Rebuilds differ (works / partial). |

## Trial card

- **Model:** DeepSeek V4 Pro (all 120 model calls).
- **What it does:** A Node CLI that creates a Quip post-quantum smart-wallet PDA on Solana via `@quip.network/solana-sdk`, then signs and submits transfers authorized by a WOTS+ signature, rotating the one-time key after every transfer. Built for Solana instead of an EVM chain, since Quip's Accounts product also ships there. The public Solana devnet faucet refused funding with HTTP 429 (a per-IP rate limit; the faucet itself was not empty), reproduced independently, so the builder and both independent rebuilds exercised the real, live Quip program against a local `solana-test-validator` cloned from public devnet.
- **Quip products and integration:** `@quip.network/solana-sdk` (Quip PQ Smart Wallet + WOTS+ signing) — OUTDATED. One rebuild called this NATIVE (the real published SDK, used exactly as intended); the other called it LEGACY (an older name for OUTDATED) because it uses the previous-generation WOTS+ package, not current SHRINCS. This report uses the conservative OUTDATED label.
- **Evidence:** local validator only for the actual create/transfer transactions (no public devnet tx exists, since the faucet never funded the run). The underlying Quip program and factory are confirmed live on public Solana devnet via direct RPC `getAccountInfo` (by one rebuild, and re-checked on 2026-09-29) — program `Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj` (`executable: true`, owned by the BPF upgradeable loader) and factory PDA `A9pdWuTNwG3Br6E8yqEJFWis3PgjJJqR471EEUa6uUV4` (owned by that program, 81 bytes of data) — given as plain addresses rather than links, because we could not confirm the explorer links.
- **Time:** 54 min.
- **Key Quip call** (`src/cli.mjs:150-159`):
```js
async function cmdTransfer(toAddr, sol) {
  const { payer, quantumSecret, vaultId } = loadContext();
  const signer = new QuipSigner(quantumSecret);
  const quip = new QuipClient(conn, keypairAdapter(payer));
  const wallet = await quip.getWallet(vaultId, signer);
  const amount = BigInt(Math.round(sol * LAMPORTS_PER_SOL));
  const before = await wallet.getBalance();
  console.log(`Signing WOTS+ transfer of ${sol} SOL from PQ wallet to ${toAddr}`);
  console.log(`  (one-time WOTS+ key will rotate to a fresh key in the same tx)`);
  const sig = await wallet.transferWithWinternitz(toAddr, amount);
```
- **What got in the way:** Solana's devnet faucet rate limit blocked public-devnet funding, and Quip's own faucet funds only Aglais. The SDK line used (`@quip.network/solana-sdk@0.0.1` with `@quip.network/hashsigs@0.1.0`) is the previous-generation WOTS+ line, not SHRINCS.

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
