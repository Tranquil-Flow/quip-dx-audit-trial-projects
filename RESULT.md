# RESULT — Quip Network evaluation

## Status: **PARTIAL**

- **Research memo: done** (below; identical copy in EVALUATION.md).
- **Testnet hands-on, working:**
  - Faucet funding and an EVM transfer on the Aglais testnet.
  - Post-quantum (SHRINCS) key generation with the official TypeScript SDK.
  - An optimisation job submitted and solved on the Quip testnet with the official Python SDK.
- **Not done:** deploying a Quip Account (the actual wallet product) on Base Sepolia. The docs have no consumer quickstart, and it needs Base Sepolia ETH from a third-party faucet. I stopped at key generation.

---

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

---

## What I built / how to run it

All paths are relative to the project dir. Throwaway keys are in `./keys` (chmod 600).

| Artifact | What it does | Run |
|---|---|---|
| `evm/genkey.mjs` | Generates a throwaway EVM key → `keys/evm-throwaway.json` | `cd evm && npm i && node genkey.mjs` |
| (shell) | Faucet + transfer on Aglais | `curl -X POST https://faucet.aglais.quip.network/request -H 'content-type: application/json' -d '{"dest":"<0xADDR>"}'` then `cast send 0x...dEaD --value 0.01ether --private-key $PK --rpc-url https://evm-rpc.aglais.quip.network:20049` |
| `sdk/keygen.mjs` | `ShrincsSigner.fromMnemonic(generateMnemonic())` (SDK_README snippet) → `keys/shrincs-throwaway-mnemonic.txt` | `cd sdk && npm i && node keygen.mjs` |
| `sdk/keypair.mjs` | Derives SHRINCS keypairs (256 and 4096 signature budgets) and times them | `node keypair.mjs` |
| `compute/local_example.py` | Docs example verbatim, local CPU solver | `python3.13 -m venv .venv && .venv/bin/pip install "xquad[quip]" && .venv/bin/python compute/local_example.py` |
| `compute/network_example.py` | Same model submitted to the Quip testnet (auto-faucet, auto-confirm) | `.venv/bin/python compute/network_example.py` (~2–3 min) |
| `browse/view.mjs`, `browse/text.mjs` | Playwright page renderer I used for the JS-only sites (the account app, aglais) | `cd browse && node view.mjs <url>` |

## Evidence

**Aglais testnet** (EIP-155 20033, RPC `https://evm-rpc.aglais.quip.network:20049`, explorer `https://explorer.aglais.quip.network`)

- `eth_chainId` → `0x4e41`; `web3_clientVersion` → `eth-rpc/HEAD-f17113f`; head block 376,647 at 2026-09-28 12:12:36 UTC.
- Throwaway EVM address: `0x2E754A9E359fA4764dbe6B94DB094808F6081504`.
- Faucet response: 200, `extrinsic_hash` `0x4a9db2e818e51497b6e2e6b51df9c52e0c55ad0c50827f97db2401718c3462aa`. Balance was 9.999 AGLS within 10 s.
- Transfer tx `0x4f142d5ca5232dd709f6019ab830bb619483b06fe7298af139edd56c4ab75b40`:
  - block 376,671, status 1, gasUsed 1,713,032.
  - Confirmed by the Blockscout API (`status: ok`, fee 0.001713032 AGLS).
  - https://explorer.aglais.quip.network/tx/0x4f142d5ca5232dd709f6019ab830bb619483b06fe7298af139edd56c4ab75b40

**Compute job** (Python `xqsa.SolverQuip` → `wss://bootnode-1.aglais.quip.network:20049/rpc`)

- Job account (hybrid-falcon512 keystore): `5GuQqo9g6j6TUezFkqb1uykCux37i2t1zXXb2kE21JvBwKxr`.
- Output: `metadata = {'order_id': 133, 'solver': '5Eb82sAEyRToSgRK51njamL6xMT2gGriDKtXTMBfR31PSvwk', 'best_energy_milli': -1000, 'energy_matches_chain': True, 'num_submissions': 3, 'num_solutions': 1}`, energy −1, elapsed 133.2 s.

**Post-quantum keys** (`@quip.network/ethereum-sdk@0.3.0-beta.8` + `hashsigs-wasm@0.2.1-rc9`)

- `recoverKeyPair(0,{maxSignatures:256})`: 7.4 s, publicKeyCommitment `0x314572af9489b784d8910db3b501e4b07b3e96ca201a3454c1ddc595c44886ff`.
- `deriveKeyPair({statefulIndex:1,statelessIndex:0,maxSignatures:4096})`: 44.1 s, commitment `0x707a9018ff7ccce2d7fec75bc722472bb3ca5b7910e02efa9bbddcc2297cdd1e`.

**Base mainnet, read-only checks** (`cast call` against `https://mainnet.base.org`)

- WalletFactory proxy `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8`:
  - `owner()` = `0xc68B64770Da7914DEb0EF238b048a0Bf3B5f6A26`. This is an **EOA**: `cast code` returns `0x`.
  - `creationFee()` = 4e14 wei; `executeFee()` = 4e12 wei.
  - Factory balance 0.3935 ETH.
  - `latestWalletImpl()` = `0xc4E4652898bB12C4f0Ba9083829689B1963135E7` (not listed in DEPLOYMENTS.md).
- Same factory address on Base Sepolia: creationFee 0.

**Registries** (verified to exist)

| Registry | Packages |
|---|---|
| npm | `@quip.network/ethereum-sdk` (latest 0.1.7 / beta 0.3.0-beta.8), `hashsigs-wasm` (0.1.0-rc1 / rc 0.2.1-rc9), `hashsigs` 0.1.0, `hashsigs-solidity` 0.1.0, `solana-sdk` 0.0.1, `arch-sdk` 0.1.1, `quip-swap-sdk` (latest beta.6 / beta beta.9), `pqhybridsign`, `quip-solver-core` |
| npm E404 | `@quip.network/sdk`, `@quip.network/quip-swap` |
| PyPI | `xquad`, `xqsa`, `xqvm-py`, `xqffi`, `xqcp` 0.4.1 (2026-09-25) |
| crates.io | `hashsigs-rs` 0.2.1-rc9, `xqvm`/`xqasm`/`xqcli` 0.4.1 |

**Wallet app:** https://account.quip.network showed "QUANTUM PROTECTED VALUE $1,155,246.39 ACROSS 23,320 WALLETS" (2026-09-28 14:04). Screenshot: `notes/account.png`.

## What did not work, and why

- **Quip Account deployment on Base Sepolia: not attempted.** No consumer quickstart exists. The package README points to docs that aren't in the package, and those docs point back to the README. It also needs Base Sepolia ETH from an external faucet (usually login- or mainnet-balance-gated). Time was better spent on due diligence.
- **`signer.runSelfTest()`** threw `TypeError: Cannot read properties of undefined (reading 'signStatelessAction')`. The method is undocumented and I guessed the call.
- **Independent verification of the compute job on Subscan** failed. Subscan is ~4 days behind the chain head ("We didn't find any results"). Plain `substrate-interface` can't decode the runtime metadata (`ValueError: Index '16' not present in Enum type mapping`). The only evidence is the SDK's `energy_matches_chain: True` and the order id.
- **Old docs** at `quip.gitbook.io` return 404. The support links in the Terms (`telegram|discord|x.quip.network`) don't resolve. The wallet app `/changelog` is blank. cryptorank.io returned 403 to my fetch, so I couldn't verify token listing data.
- **Commercial terms, SLA, and audit reports:** not public. I did not contact the vendor (no public posting, per the rules).

## Top 5 changes to Quip's docs/site that would have helped most

1. **Link the Aglais testnet page from the docs and delete the "Connection details for the public test network have not been published yet" sentence.** Put the RPC, chain ID 20033, faucet and explorers on the Submit-a-Job and Quip SDK pages. Redirect `quip.gitbook.io/docs` (and the links.quip.network entries) to developers.quip.network.
2. **Add a consumer "Create and use a Quip Account on Base Sepolia in 10 minutes" guide for `@quip.network/ethereum-sdk`.** Ship SDK_README / DEPLOYMENTS / GOVERNANCE in the npm tarball or link them from a stable branch. Add `license` and `repository` to package.json, and move the `latest` dist-tags off the 2025 builds.
3. **Publish a "Status and deployments" page:** per-product mainnet/testnet status, per-chain contract addresses (including the current `latestWalletImpl`), the factory owner, the fee schedule, and links to audit reports. It should agree with the FAQ ("free" vs. the $1 creation fee).
4. **Fix the contradictions:**
   - WOTS+ "preferred" (Quickstart) vs "previous-generation" (SDK page).
   - "No slashing" (QuipSwap) vs "Slashable approval timeout" (Lifecycle).
   - "No swap SDK" vs `@quip.network/quip-swap-sdk` on npm.
   - The 20049 "QUIP network chain ID" vs testnet 20033.
   - "over MCP" with no MCP endpoint.
5. **Integrator commercial and support page:** AGPL vs commercial licence (price range or process), a developer support channel with working links (fix `telegram|discord|x.quip.network` in the Terms), expected response times, and a status page. Also document `SolverQuip`'s `faucet`/`autofund`/`autoconfirm` arguments, and warn that the default keystore is unencrypted.

Supporting logs: DEVLOG.md (every URL and command in order), FRICTION.md (18 items with quotes and time costs).

## Sources

- Quip home: https://quip.network/
- Docs: https://developers.quip.network/docs and the `.md` mirrors listed at https://developers.quip.network/docs/llms.txt
- Testnet: https://aglais.quip.network/
- Wallet app: https://account.quip.network/ (faq, terms, disclaimer)
- Code: https://gitlab.com/quip.network and https://github.com/QuipNetwork
- Packages: https://www.npmjs.com/package/@quip.network/ethereum-sdk, https://pypi.org/project/xquad/, https://crates.io/crates/hashsigs-rs
- Press: https://www.prnewswire.com/news-releases/quipnetwork-launches-quantum-classical-blockchain-testnet-opens-doors-to-global-research-community-302732654.html
- Coverage: https://www.coindesk.com/tech/2026/04/28/emb-2-pm-utc-new-wallet-offers-way-to-tackle-bitcoin-s-quantum-risk-without-a-fork
