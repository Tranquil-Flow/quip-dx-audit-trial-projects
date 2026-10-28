# Quip Network — Integration Evaluation

**To:** CTO · **From:** TPM · **Date:** 2026-09-28 · **Basis:** public sources only + hands-on testnet run

## What Quip is

Two products share one token:

1. **Quip Network (L1)** — a Substrate chain whose proof-of-work is a useful Ising/optimisation job; miners are CPUs, GPUs and quantum annealers, and consumers post problems with a reward. **Testnet only.**
2. **Asset Layer** — a post-quantum cosigner wallet ("Quip Account", hash-based WOTS+/SHRINCS) that wraps MetaMask, Ledger and Safe on chains you already use, plus **QuipSwap** (bridgeless cross-chain atomic swaps) and **QVRF** (quantum-sourced randomness).

## What is live, and where

| Product | State | Evidence |
|---|---|---|
| Quip L1 chain | **Testnet only** ("Aglais"). No mainnet announced. | quip.network: "Live on testnet"; "resell excess capacity ... when mainnet launches" |
| Aglais testnet (chain id 20033, token AGLS, no value) | **Live** | wss://bootnode-1.aglais.quip.network:20049/rpc answered; jobs run (below) |
| Quip Account contracts (asset layer) | **Deployed on Ethereum and Base mainnet** | `eth_getCode` non-empty for Deployer `0xF768b4E4A314C9119587b8Cd35a89bDC228290b5`, WOTSPlus `0x1Ad02caBfc65ed65FDF6da64108f04f71E2e8991`, QuipFactory `0x4a5A444F3B12342Dc50E34f562DfFBf0152cBb99` on both |
| Quip Account wallet client | **Beta** | vault.quip.network: "quantum-safe account (currently in beta)" |
| QuipSwap | **Live on Base**; order book + browser extension "coming soon" | quip.network/quipswap: "Launched and live on Base, with more EVM chains coming very soon" |
| QVRF | **Live** | blog 2026-09-11 (Quantum Echoes mint on Ethereum) |
| Compute marketplace (buy/sell jobs) | **Not open** | cost blog: "The market opens when the network launches" |
| $QUIP token | **Not launched** | points.quip.network: "Earn points toward the Quip airdrop, paid out in $QUIP at TGE" |

## SDKs and how mature they look — pre-1.0 across the board

- **Python (compute):** `pip install "xquad[quip]"` → PyPI 0.4.1, **requires Python ≥3.13**. Pulls `xqsa`, `xqffi`, `xqcp`, `quip-signer`, `substrate-interface`. Docs label XQuad "**Early public release** … instruction set, binary format, and public API may change before v1.0", and the `[quip]` chain interfaces "pre-release".
- **JS/TS (wallet):** `@quip.network/ethereum-sdk` (npm `latest` 0.1.7, `beta` 0.3.0-beta.8) and `@quip.network/hashsigs-wasm` (npm `latest` 0.1.0-rc1, `rc` 0.2.1-rc9). **Install must use the tags** (`@beta`, `@rc`) — a plain `npm install` silently pulls 2025 builds that predate the current signature scheme.
- **Solidity / Rust / C++:** `@quip.network/hashsigs-solidity` 0.1.0, `hashsigs-rs` 0.2.1-rc9, `hashsigs-cpp` — explicitly marked "previous generation".
- Repo README (`ethereum-sdk`): "**currently in active development and is not yet ready for production use**".
- Audit: Oak Security, "2026-09-24 Audit Report – Quip v1.0" (contracts + Ethereum SDK) is published; QuipSwap findings are still "to be published shortly".

## Cost

- Compute jobs are **pay-per-result** (you set a reward and quality floors; escrowed until a valid answer arrives; refunded if none does). No published price list. On testnet I measured the floor exactly: **reward 1 AGLS + protocol fee 0.001896569299 AGLS per job**. `quote()` returns the fee before you commit.
- The token is not launched, so **none of this can be converted to a budget number yet**. The vendor's own cost article gives only third-party anchors (enterprise quantum reserved contracts "start around $50,000").
- Asset-layer fees are described only as a "flat fee (protocol fee)" and "a % routed to treasury" — no values published.

## Support

Discord (`discord.gg/quipnetwork`), Telegram, X, research forum (`research.quip.network`), feedback board, a generic `hello.quip.network` contact form, and GitHub/GitLab issues. There is **no status page, no SLA, no ticketing system, and no named partner/solutions contact** that I could find on the site or docs.

## Risks

1. **No mainnet for the L1.** Compute is unusable in production; date is "later this year"/"when mainnet launches".
2. **Everything is pre-1.0 and tag-pinned.** Version drift is a live hazard — docs themselves warn the default dist-tag ships stale code.
3. **One-time signatures are a real integration footgun.** WOTS+ slots are single-use; the chain does not track slot state, so an integrator who signs directly owns that bookkeeping. Docs also warn ERC-1271 `isValidSignature` checks are **replayable** — no replay protection on that surface.
4. **Documentation lags the product.** The compute page says testnet connection details "have not been published yet" while the Aglais site publishes public RPCs; several official pages still link the dead `quip.gitbook.io` docs.
5. **Asset layer is gated.** Only Quip wallet contracts can initiate a swap; the browser extension is unreleased; the wallet is in beta.
6. **Token/valuation ambiguity.** No $QUIP exists, but lookalike "QUIP" tokens trade on Etherscan and Jupiter (one showing implausible gains) — brand/impersonation risk for us.
7. **Liquidity/thinness.** All three jobs I ran were answered by a single solver key; the network publishes one default topology only.
8. **Python ≥3.13 requirement** and a substrate runtime too new for the latest released Python Substrate client (metadata decode failed) — expect tooling friction.

## Recommendation

The **Asset Layer (post-quantum cosigner account)** is the only piece with mainnet contract presence today, and it is the piece that matters for a wallet company — but ship-blockers are the beta SDK, the one-time-signature state burden, and the ERC-1271 replay caveat. Ask Quip for: (a) the Oak Security report for QuipSwap specifically, (b) a pinned production version + support contact, (c) their recommended pattern for slot-state management in a hosted wallet. **Do not integrate the compute marketplace yet** — revisit once the L1 mainnet ships and RPC/pricing are published.
