# FRICTION — Quip Network evaluation

Time costs are estimates of what a person would lose, not my own wall-clock time. Items are in the order I hit them.

### F1. Search engine's top docs result is dead (and the official link tree still points to it)
- URL: https://quip.gitbook.io/docs and https://quip.gitbook.io/docs/getting-started/quickstart (top hits for "Quip Network quantum wallet SDK docs"). The same dead URL is linked from https://links.quip.network/ ("https://quip.gitbook.io/docs", "https://quip.gitbook.io/docs/nodes/run-a-node-testnet").
- Expected: the docs. Actual: HTTP 404 with no redirect to developers.quip.network.
- Cost: ~5 min (I went back to quip.network and clicked "Docs").

### F2. Docs say the testnet has no published connection details, but a whole testnet site exists
- URL: https://developers.quip.network/docs/compute/submit-a-job
- Quote: "Connection details for the public test network have not been published yet, so this page cannot include a node address."
- Actual: https://aglais.quip.network/ ("AGLAIS TESTNET IS LIVE") publishes RPCs, chain ID 20033, explorers, and a faucet. The docs never link to it. I only found it through the GitLab README of `explorer.quip.network`.
- Cost: ~15 min. A less persistent person would have stopped and marked compute as "not testable".

### F3. The SDK page says no swap SDK exists, but one is on npm
- URL: https://developers.quip.network/docs/getting-started/quip-sdk
- Quote: "There is no public `@quip.network/quip-swap` or `@quip.network/sdk` package, and no swap SDK is published today. Use the wallet for swaps."
- Actual: `@quip.network/quip-swap-sdk` is published (latest=0.1.0-beta.6, beta=0.1.0-beta.9, next=0.1.0-beta.5; "TypeScript SDK for the Quip Swap Omnibus protocol"). `@quip.network/arch-sdk`, `pqhybridsign`, `quip-solver-core`, and `solana-sdk` are also published and not listed.
- Cost: ~5 min, plus lasting uncertainty about which packages are supported.

### F4. Quickstart and SDK page disagree about which signature library to use
- Quickstart (https://developers.quip.network/docs/getting-started/quickstart): "the preferred Winternitz One-Time Signature (WOTS+), is available as a library for rust, c++, typescript, and solidity".
- SDK page: WOTS+ libraries are "Previous-generation libraries ... New integrations should use the packages in the tables above" (SHRINCS / hashsigs-wasm).
- "What is Quip" also says "hash-based vaults wrap ECC keys with quantum-resistant WOTS+ keys".
- Cost: ~5 min to work out that SHRINCS is current.

### F5. `latest` npm tags point to obsolete builds
- URL: https://developers.quip.network/docs/getting-started/quip-sdk. The warning is good: "A plain `npm install` resolves the `latest` tag, which for these packages points at builds from 2025".
- Still, anyone arriving from npmjs.com or a search result (for example the npm page for `@quip.network/ethereum-sdk`) gets 0.1.7 from 2025-06. That version ships `jest`, `@types/jest`, and `dotenv` as runtime dependencies.
- `@quip.network/hashsigs` has `rc` → 0.2.0-rc.1 even though 0.2.0-rc.2 is published.
- Cost: none for me, because I read the docs first. It's a trap for everyone else.

### F6. The beta SDK has no README on npm, no license/repository metadata, and a circular docs pointer
- npm registry metadata for `@quip.network/ethereum-sdk@0.3.0-beta.8` has no `license` and no `repository`. The description is literally "[![License: AGPL-3.0-or-later](https://img.shields.io/badge/...)](#license)".
- The bundled README.md is a contributor/deployer guide ("Contact Rick first", "Only authorized personnel..."). Its "Documentation map" links SDK_README.md, DEPLOYMENTS.md, and GOVERNANCE.md, but those files are not in the tarball.
- The README says "Active Dev Branch : deploy/testnet". On GitLab, `https://gitlab.com/quip.network/ethereum-sdk/-/raw/deploy%2Ftestnet/SDK_README.md` returns 404: that branch exists only on the GitHub mirror. `main` also 404s. I found the files on branch `v1.0.0-rc.2` after listing branches through the API.
- SDK_README.md then says: "For installation and a quickstart, see the package `README.md`." The package README has no consumer quickstart.
- Cost: ~20 min. No end-to-end "create a Quip Account on Base Sepolia" example exists anywhere I could find.

### F7. Support links in the Terms don't resolve
- URL: https://account.quip.network/terms, section 28: "Telegram: https://telegram.quip.network / Discord: https://discord.quip.network / X: https://x.quip.network"
- Actual: none of the three hostnames has a DNS record. (https://discord.gg/quipnetwork from the homepage does work.)
- Cost: ~3 min. It also matters for the risk section: the only contractual support channels are broken links.

### F8. Wallet app changelog is blank
- URL: https://account.quip.network/changelog (linked in the app footer as "Changelog")
- Actual: an empty page after 8 s wait (screenshot notes/changelog.png).
- Cost: ~2 min.

### F9. "Free" in the FAQ vs. on-chain fees
- URL: https://account.quip.network/faq. Quote: "Creating and using a Quip Account through the Quip App is free — we do not charge a subscription or platform fee."
- Actual: the Base mainnet WalletFactory charges `creationFee` = 0.0004 ETH and `executeFee` = 0.000004 ETH per execute (DEPLOYMENTS.md; verified with `cast call`). The docs' Token page also lists "Account deposit | Creator | Flat fee (protocol fee)".
- Cost: ~10 min to reconcile. A PM could quote "free" to the CTO and be wrong.

### F10. Slashing: yes or no?
- https://developers.quip.network/docs/quip-interlock-protocol/quipswap: "**No slashing.** The protocol does not penalize a party who commits and then walks away."
- https://developers.quip.network/docs/quip-interlock-protocol/quip-lifecycle: "_Slashable approval timeout_: ... any approver can slash QUIPs belonging to the delinquent parties."
- The Token page says "Swap open | Both parties | Escrow (slashable)".
- Cost: ~5 min, unresolved.

### F11. Chain ID confusion: 20049 vs 20033
- SDK_README (QUIP HD path): "`network` defaults to `20049` ... the QUIP network chain ID". The SDK exports `NETWORK_QUIP = 20049`, and the node port is also 20049.
- The live testnet is EIP-155 **20033** (aglais.quip.network, quip-validator README, `eth_chainId` = 0x4e41).
- Cost: ~5 min.

### F12. Docs promise an MCP server that the linked page doesn't describe
- https://developers.quip.network/docs: "these pages are also available as markdown and over MCP". The SDK page says "the site runs an MCP server".
- https://developers.quip.network/docs/getting-started/use-with-ai describes only `.md` mirrors and `llms.txt`/`llms-full.txt`. No MCP URL is given.
- Cost: ~2 min. The `.md` mirrors themselves were very useful.

### F13. The compute docs omit the arguments you actually need
- https://developers.quip.network/docs/compute/submit-a-job shows only `url=` and `keystore=`/`seed=`, and says you need "a funded account".
- `SolverQuip`'s signature has `faucet=`, `autofund=`, `autoconfirm=`, `topology=`, `deadline_blocks=`, and more. Without `autoconfirm`/`autofund` I'd have had to work out funding separately. I only found these with `inspect.signature`.
- Running the docs example verbatim prints `result.sample` as `XQMX(mode=SAMPLE, ...)` rather than the spin/bit assignment.
- My tiny 4-variable model triggered "2 encoded coefficient(s) fall outside this topology's allowed-value set". The docs don't mention this.
- Cost: ~10 min.

### F14. The keystore is written unencrypted by default
- Docs quote: "a keystore file, which is created for you on first use if it does not exist".
- Actual: keys/quip-keystore.json has `"encrypted": false` and `master_seed_hex` in plaintext. There's no warning in the docs or on the console.
- Cost: none, but it's a security footgun for anyone who reuses the pattern.

### F15. Testnet explorers are behind or partial
- The Subscan widget on aglais.quip.network showed latest block #313,188 while the EVM head was #376,647. My Substrate account on https://subscan.aglais.quip.network returned "We didn't find any results".
- Plain `substrate-interface` fails to decode runtime metadata (`ValueError: Index '16' not present in Enum type mapping`).
- Cost: ~10 min. I couldn't independently verify my compute job's extrinsics.

### F16. Plain transfer uses 1.7M gas on the testnet EVM
- `cast send` of 0.01 AGLS: gasUsed 1,713,032 and cumulativeGasUsed 0 (pallet-revive weight mapping). It's harmless on testnet, but gas estimation in a wallet would look strange. The aglais site does warn about other EVM quirks (no pubsub, balance reads one existential deposit low).
- Cost: ~2 min.

### F17. Suspicious GitHub star counts
- github.com/QuipNetwork: quip-miner 11,596★, ethereum-sdk 11,341★, hashsigs-rs 11,213★, hashsigs-ts 11,191★. Sibling repos and all GitLab originals have 0–10★.
- Not a docs issue, but a due-diligence red flag. I'd discount GitHub stars as a traction signal here.

### F18. npm package repository URLs point to a nonexistent GitHub org
- `@quip.network/solana-sdk` → `github.com/quip-network/quip-anchor`, and `arch-sdk` → `github.com/quip-network/quip-arch`. `api.github.com/orgs/quip-network` returns 404; the real org is `QuipNetwork`.
- Cost: ~2 min.
