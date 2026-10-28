# Quip Network: integration evaluation (one-pager)

**To:** CTO · **From:** Product · **Date:** 2026-09-28 · **Basis:** public docs, package registries, repos, block explorers, plus hands-on tests on testnet (evidence in RESULT.md)

**Recommendation: don't integrate for production yet.** Run a 1–2 week technical spike on Base Sepolia and start commercial and security due diligence in parallel. The post-quantum account product is real and has users on Base mainnet. But the SDK is a pre-1.0 beta, governance is a single key, and the license is AGPL, so a closed-source wallet needs a commercial license. The Quip chain and token are not on mainnet.

## What exists and what's live

The vendor is Postquant Labs (Hadamard Gate Inc, Delaware).

| Product | What it is | Status (verified 2026-09-28) |
|---|---|---|
| **Quip Account** (post-quantum smart wallet) | ERC-4337 smart account on existing chains. Every action needs the user's normal ECDSA key **plus** a hash-based post-quantum signature (SHRINCS). Web app at account.quip.network and a Chrome extension. | **Mainnet: Base (8453)**, current V1.0.1 generation since 2026-08-28. **Testnet:** Base Sepolia and OP Sepolia. The app counter shows **$1.155M across 23,320 wallets**. Older WOTS+ contracts on Ethereum/OP/Base are "sunset". SDKs for Solana (0.0.1), Arch and MIDL (Bitcoin L2s) exist, but I did not verify their deployments. |
| **Quip Network chain** (useful-work PoW, Substrate + EVM) | Miners solve Ising optimisation jobs. | **Testnet only.** "Aglais" is chain ID 20033, a recent chain-wipe relaunch, with 6 s blocks. **No mainnet. QUIP token TGE not announced** (originally targeted for Q2 2026). |
| **Compute jobs** (xquad/xqsa) | Post an optimisation problem with a reward; miners compete to solve it. | **Works on testnet.** I submitted a job and it was solved on-chain in 133 s. |
| **QuipSwap** (HTLC atomic swaps) | Bridgeless cross-chain swaps. | Contract is gated: **only Quip wallets can initiate**. The docs say no swap SDK exists, but `quip-swap-sdk` beta is on npm. |
| **QVRF** (quantum randomness) | Randomness oracle. | V0 is **operator-trusted**. The interface and fee model are "still being finalized"; no public API. |

## SDKs and how mature they look

- **`@quip.network/ethereum-sdk@beta` (0.3.0-beta.8, TypeScript)** is the relevant one for us. It had 11 betas in 4 months and the README says "not production-ready". The npm page has no README, license, or repository metadata. There's no consumer quickstart; the real reference (SDK_README.md) is on a GitLab release branch. **Watch out:** `latest` installs an obsolete 2025 build.
- **`@quip.network/hashsigs-wasm@rc` (0.2.1-rc9)** handles post-quantum key generation and signing in Node and the browser. It worked. Key generation took **7 s for a 256-signature key and 44 s for a 4096-signature key** on an M-series Mac, which is a UX concern on mobile.
- **Python `xquad` / `xqsa` 0.4.1** (compute; requires Python ≥3.13) installed cleanly and worked, but the docs omit key arguments.
- The code is very actively developed (daily commits on GitLab, mirrored to GitHub). The internal design docs are thorough, and the contracts were audited by Oak Security (finding IDs are cited in the changelog), but **no audit report is linked from the docs**.

## Cost

- **Licence:** everything is **AGPL-3.0**. A closed-source wallet needs a commercial licence from legal@quip.network, and **pricing is not published**.
- **Per-user fees on Base mainnet**, charged by the Quip factory contract in addition to gas: **0.0004 ETH (~$1) per account creation** and **0.000004 ETH (~$0.01) per transaction**. The owner can change both at any time up to 1 ETH; each transaction signs its own fee ceiling. This contradicts the app FAQ, which says the account is "free". The gas overhead of post-quantum verification is not documented, and I didn't measure it.
- **Compute and QVRF** are paid in QUIP, which doesn't exist on mainnet yet. The fee model is TBD.
- **Professional services** are available from bd@postquant.xyz; pricing is not public.

## Support

There's no SLA, no status page, and no developer support tier. The channels are Discord, Telegram, X, and a feedback board (feedback.quip.network). The Terms list telegram/discord/x.quip.network as the support channels, but **none of those three links resolves**. For commercial contact, use legal@quip.network and bd@postquant.xyz.

## Risks (highest first)

1. **Governance and centralisation.** One EOA (`0xc68B…6A26`) owns the Base mainnet factory. It can UUPS-upgrade the factory, vet new wallet implementations, change fees, and withdraw fees, with no timelock. The vendor's own GOVERNANCE.md recommends a multisig, and that recommendation isn't followed on mainnet. User funds are not directly at risk; denial of service and a malicious "latest" implementation are.
2. **Maturity.** Beta SDK, doc drift (the live wallet implementation isn't listed in DEPLOYMENTS.md), a recorded mainnet key slip, and a paymaster whose "EntryPoint deposit/stake [is] not yet funded".
3. **Stateful signatures.** Each post-quantum key has a finite one-time-signature budget. Reusing a slot weakens security, so we would own slot tracking, backup/restore, and rotation. ERC-1271 signatures are explicitly **not** one-time (replay is our problem).
4. **Licence (AGPL)** and unknown commercial terms.
5. **Token and roadmap.** Mainnet and TGE slipped. Much of the site is airdrop/points-driven. GitHub star counts look inflated (11k★ on some repos, 0★ on the GitLab originals).
6. **Docs quality.** The docs contradict themselves on WOTS+ vs SHRINCS, on slashing, and on whether testnet details are published. The top search result for the docs is a dead GitBook.

## Suggested next steps

1. Ask Postquant for commercial licence terms, the Oak audit reports, their mainnet multisig/timelock timeline, and a support SLA.
2. Spike: create and use a Quip Account on Base Sepolia from our wallet via the SDK, and measure gas plus key-generation time on a mid-range phone.
3. Zero-integration option: Quip Accounts already accept any WalletConnect wallet as the classical co-signer. Confirm that our wallet works as that signer. That gets us "works with Quip" at near-zero cost.
