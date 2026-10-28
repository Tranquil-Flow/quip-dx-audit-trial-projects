# DEVLOG — Quip Network evaluation

Started: Mon 28 Sep 2026 14:04:53 CEST

## Phase 1 — Discovery (14:05–14:15)

1. Web search "Quip Network blockchain" — found PR Newswire (2026-04-02) testnet launch w/ D-Wave, cryptorank price page, bitrue/mpost blogs.
2. Web search "Quip Network quantum wallet SDK docs" — top docs hit is https://quip.gitbook.io/docs and https://quip.gitbook.io/docs/getting-started/quickstart; also npm @quip.network/solana-sdk, github QuipNetwork/cpp-sdk.
3. https://quip.network/ — marketing home. Looking for products/status. Claims: "Quip Network is live in testnet with real users protecting real assets.", "500+ Active testnet nodes", "20,000+ Quantum-resistant wallets deployed", "$1M+ Quantum-protected value on chain". Nav links: Docs -> developers.quip.network/docs, Points, Deposit & Earn (account.quip.network), GitHub, Discord, Telegram.
4. https://quip.gitbook.io/docs — **404** (search engine's top docs result is dead).
   Command: `curl -sL -o /dev/null -w "%{http_code}"` over key URLs -> gitbook 404 (both /docs and /docs/getting-started/quickstart); developers.quip.network/docs 200; points/account 200; discord.gg/quipnetwork -> discord.com/invite/quipnetwork 200.
5. https://developers.quip.network/docs — current docs (Astro site). Sidebar: Quickstart, What is Quip, Quip SDK, Use with AI, Interlock Protocol (How it fits, QUIP, Accounts, QuipSwap, Lifecycle), Compute (Submit job, QVRF, Ising Topologies), Basics, Network (Participants, Token), Nodes (Run a Node (TestNet), Miners), XQuad.
6. https://developers.quip.network/docs/llms.txt — index of markdown mirrors (the "Use these docs with AI" page says to use these rather than scraping HTML). Downloaded all 20 page mirrors (`<page>.md`) into notes/docs/ — all HTTP 200.
7. Read: Welcome, Quickstart, Quip SDK, Run a Node (TestNet), Miners, Submit a Job, What is Quip, Use with AI, Token, Quip Accounts, QuipSwap, QVRF, XQuad Toolchain, How it fits together, QUIP Lifecycle.
   Key facts:
   - Quip SDK page: npm `@quip.network/ethereum-sdk@beta`, `@quip.network/hashsigs-wasm@rc`; PyPI `xquad`, `xqsa`. Explicit warning that `latest` tags point to 2025 builds predating current signature scheme. "There is no public `@quip.network/quip-swap` or `@quip.network/sdk` package".
   - Submit a Job: "Connection details for the public test network have not been published yet, so this page cannot include a node address." -> cannot submit a network job.
   - QVRF: "The request interface, the fee model, and the exact certification parameters are still being finalized." V0 is operator-trusted.
   - QuipSwap: settlement contract gated — "only Quip wallet contracts can initiate a swap".
   - Licensing: AGPL-3.0; commercial via legal@quip.network; services bd@postquant.xyz.

## Phase 2 — Package & repo verification (14:15–14:30)

8. `npm view` on the packages named in docs + scope search (`registry.npmjs.org/-/v1/search?text=@quip.network`):
   - @quip.network/ethereum-sdk: latest=0.1.7 (2025-06-03), beta=0.3.0-beta.8 (2026-09-15). 11 betas since May 2026. beta has NO `license` or `repository` field in package.json; description is a raw markdown badge; registry readme empty. latest 0.1.7 ships jest/@types/jest/dotenv as runtime deps.
   - @quip.network/hashsigs-wasm: latest=0.1.0-rc1, rc=0.2.1-rc9 (2026-08-27). AGPL-3.0-or-later.
   - @quip.network/hashsigs 0.1.0 / rc 0.2.0-rc.1 (but 0.2.0-rc.2 exists untagged); hashsigs-solidity 0.1.0; solana-sdk 0.0.1 (single version, 2025-08).
   - NOT in docs but published: @quip.network/quip-swap-sdk (latest=0.1.0-beta.6, beta=0.1.0-beta.9, next=0.1.0-beta.5), arch-sdk 0.1.1, pqhybridsign 0.0.0-rc1/next rc9, quip-solver-core 0.0.1 (Apache-2.0).
   - `@quip.network/sdk` and `@quip.network/quip-swap` -> npm E404 (matches docs).
9. PyPI JSON API: xquad/xqsa/xqvm-py/xqffi/xqcp all 0.4.1 (uploaded 2026-09-25), requires_python >=3.13, AGPL-3.0-or-later, extras [cuda,dwave,metal,quip]. No project_urls/homepage on PyPI.
10. crates.io API: hashsigs-rs 0.2.1-rc9 (2644 downloads), xqvm/xqasm/xqcli 0.4.1.
11. GitHub API orgs/QuipNetwork: ~40 repos, very active (pushes up to 2026-09-26). Star counts anomalous: quip-miner 11,596, ethereum-sdk 11,341, hashsigs-rs 11,213, while sibling repos have 0 and GitLab mirrors have 0-10 stars. Repos include faucet, explorer.quip.network, chainlist, quip-validator (Substrate fork), polkadot-sdk fork.
    npm packages point at github.com/quip-network/... -> org 404 (real org is QuipNetwork).
12. GitLab API groups/quip.network: canonical source (GitHub are mirrors). developers.quip.network repo updated today.
13. Subdomain probes: explorer/faucet/dashboard/rpc/testnet/api/status/app .quip.network -> no DNS. links/learn/echoes/wallet/feedback -> 200. check -> 404.
14. https://links.quip.network/ (official link tree) — still links docs to https://quip.gitbook.io/docs (404).
15. Installed Playwright (npm i playwright@1.58 in ./browse) to render SPA pages (WebFetch only saw title "QUIP Account").
16. https://account.quip.network/ -> redirects /connect. "QUANTUM PROTECTED VALUE $1,155,246.39 ACROSS 23,320 WALLETS". Airdrop eligibility / Quip Quests promo. WalletConnect/AppKit (web3modal) used.
17. https://account.quip.network/faq — expanded accordions: free, only gas; self-custodial; "firewall" wrapping MetaMask/Ledger/Safe with PQ co-signer; WalletConnect to dApps.
18. https://account.quip.network/changelog — renders blank page (screenshot notes/changelog.png).
19. https://account.quip.network/disclaimer, /terms — operator "Hadamard Gate Inc dba Postquant Labs, a Delaware Corporation", info@postquant.xyz; Delaware law; arbitration Denver CO; "Postquant may change its own fees at any time"; support = Telegram/Discord/X only.
## Phase 3 — Finding the testnet & hands-on (14:30–14:45 working time; wall clock 14:10–14:16)

20. Read GitLab READMEs (raw): ethereum-sdk (old-gen: WOTSPlus/QuipFactory addresses, "not yet ready for production use", "contact Rick"), quip-validator (public testnet EIP-155 20033, "Runtime 117 is the H2/H4 chain-wipe relaunch"), explorer.quip.network (-> explorer.aglais.quip.network, evm-rpc.aglais.quip.network:20049), faucet (POST /request).
21. `dig` + curl: evm-rpc.aglais.quip.network:20049 eth_chainId -> 0x4e41 (20033). net_version 20033; eth_gasPrice 1 gwei; web3_clientVersion eth-rpc/HEAD-f17113f; latest block 376647 @ 2026-09-28 12:12:36 UTC. Plain http on that port -> nginx 400. faucet /health -> {"status":"ok"}.
22. https://aglais.quip.network/ (rendered w/ Playwright) — "Aglais is the Quip Network Testnet". Full chain details: Substrate wss://bootnode-{1-3}.aglais.quip.network:20049/rpc, SS58 42, 12 decimals; EVM https://evm-rpc.aglais.quip.network:20049, chain 20033, 18 decimals, pallet-revive, explorer.aglais.quip.network, subscan.aglais.quip.network, portal.aglais.quip.network; faucet curl. NOT linked from developers.quip.network docs.
    Note: Subscan widget shows latest block #313,188 while EVM head is #376,647 (Subscan ~63k blocks / ~4 days behind).
23. Generated throwaway key with viem `generatePrivateKey()` -> keys/evm-throwaway.json, address 0x2E754A9E359fA4764dbe6B94DB094808F6081504.
24. Faucet (command copied from aglais site):
    `curl -X POST https://faucet.aglais.quip.network/request -H 'content-type: application/json' -d '{"dest":"0x2E75..."}'`
    -> 200 {"amount":10000000000000, ..., "extrinsic_hash":"0x4a9db2e818e51497b6e2e6b51df9c52e0c55ad0c50827f97db2401718c3462aa"} (no block_hash field though faucet README promises one).
    `cast balance` after <10 s -> 9.999 AGLS (one existential deposit low, as documented on aglais site).
25. `cast send 0x...dEaD --value 0.01ether` -> status 1, tx 0x4f142d5ca5232dd709f6019ab830bb619483b06fe7298af139edd56c4ab75b40, block 376671, gasUsed 1,713,032 (for a plain transfer!), cumulativeGasUsed 0. Blockscout API confirms status ok, fee 0.001713032 AGLS.
## Phase 4 — SDK hands-on (wall clock 14:16–14:24)

26. Installed exactly as docs say (sdk/): `npm install @quip.network/ethereum-sdk@beta` -> 0.3.0-beta.8; `npm install @quip.network/hashsigs-wasm@rc` -> 0.2.1-rc9. `npm audit`: 5 vulnerabilities (1 low, 4 moderate). Peer dep `ethers@^6` not auto-installed (not needed for what I ran).
27. npmjs.com shows no README for the beta (registry readme empty; npm renders `latest`=0.1.7). The tarball *does* ship README.md: a contributor/deployer README ("Active development — not production-ready", "Contact Rick first"), links to SDK_README.md / DEPLOYMENTS.md / GOVERNANCE.md / TODO.md which are NOT in the tarball.
28. GitLab raw fetch of those files on `main` and `deploy/testnet` -> 404 (README says "Active Dev Branch : deploy/testnet"; that branch exists only on the GitHub mirror). Found them on GitLab branch `v1.0.0-rc.2` (listed branches via GitLab API).
    - SDK_README.md: SHRINCS client reference. Says "For installation and a quickstart, see the package README.md" — that README has no consumer quickstart (circular).
    - DEPLOYMENTS.md: V1.0.1 live on Base mainnet (8453) since 2026-08-28, Base Sepolia + OP Sepolia since 2026-08-27. Factory fees on Base mainnet: creation 0.0004 ETH (~$1), execute 0.000004 ETH (~$0.01), MAX_FEE 1 ETH. Paymaster "EntryPoint deposit/stake not yet funded". A mainnet paymaster init used the testnet key ("a `.env` expansion slip") and was rotated same day.
    - GOVERNANCE.md: factory owner = single classical address; can vet impls, set fees, withdraw, UUPS-upgrade factory, no timelock. Recommends multisig.
29. Read-only on-chain check, Base mainnet public RPC (`cast call`): factory proxy 0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8 -> owner 0xc68B64770Da7914DEb0EF238b048a0Bf3B5f6A26 (EOA: no code; = CANONICAL_OPERATOR in DEPLOYMENTS.md); creationFee 4e14 wei; executeFee 4e12 wei; factory balance 0.3935 ETH (accumulated fees); latestWalletImpl 0xc4E4652898bB12C4f0Ba9083829689B1963135E7 (not listed in DEPLOYMENTS.md on rc.2 -> doc drift). Base Sepolia factory: code present, creationFee 0. Aglais testnet (20033): no factory code.
30. SDK_README snippet `ShrincsSigner.fromMnemonic(generateMnemonic(), {passphrase:"optional"})` -> OK (89 ms). Throwaway mnemonic saved to keys/shrincs-throwaway-mnemonic.txt.
    `signer.recoverKeyPair(0,{maxSignatures:256})` -> OK in 7.4 s. `signer.deriveKeyPair({statefulIndex:1,statelessIndex:0,maxSignatures:4096})` (shape from DEPLOYMENTS.md) -> OK in 44.1 s (Apple Silicon, Node 22). `signer.runSelfTest()` with no args -> TypeError "Cannot read properties of undefined (reading 'signStatelessAction')" (undocumented method; guessed call).
    SDK constants: CHAIN_IDS = {1, 10, 8453, 11155111, 84532, 11155420, MIDL_TESTNET 777}; NETWORK_QUIP = 20049 (vs live testnet chain id 20033).
    Did NOT deploy a Quip Account on Base Sepolia: would need Base Sepolia ETH from a third-party faucet + an end-to-end consumer example that the docs don't provide. Stopped here.

## Phase 5 — Compute job on testnet (wall clock 14:21–14:26)

31. `python3.13 -m venv .venv && pip install "xquad[quip]"` (verbatim from docs) -> xquad/xqsa/xqvm_py/xqcp/xqffi 0.4.1, quip-signer 0.3.0, substrate-interface 1.8.1. Clean install.
32. Docs local example verbatim (compute/local_example.py) -> `XQMX(mode=SAMPLE, domain=BINARY, size=4, linear_terms=1, quadratic_terms=0) -1` — energy correct; `result.sample` prints an object repr, not the assignment.
33. `inspect.signature(SolverQuip.__init__)` -> reveals undocumented kwargs faucet=, autofund=, autoconfirm=, topology=, deadline_blocks= etc.
34. compute/network_example.py: SolverQuip(url="wss://bootnode-1.aglais.quip.network:20049/rpc", keystore="keys/quip-keystore.json", faucet="https://faucet.aglais.quip.network", autofund=True, autoconfirm=True) -> connected in 18.6 s; UserWarning about coefficients outside topology allowed-value set; RESULT energy -1; metadata {'order_id': 133, 'solver': '5Eb82sAEyRToSgRK51njamL6xMT2gGriDKtXTMBfR31PSvwk', 'best_energy_milli': -1000, 'energy_matches_chain': True, 'num_submissions': 3, 'num_solutions': 1}; total 133.2 s.
    Keystore created on first use: scheme "hybrid-falcon512", **"encrypted": false, master seed in plaintext**. Account 5GuQqo9g6j6TUezFkqb1uykCux37i2t1zXXb2kE21JvBwKxr.
35. https://subscan.aglais.quip.network/sub/account/5GuQ... -> "We didn't find any results" (Subscan ~4 days behind).
36. Plain substrate-interface `System.Account` query -> `ValueError: Index '16' not present in Enum type mapping` (chain "AGLS (Quip Testnet)", head 376772). Needs xqsa's V14 shim; gave up on independent balance check.

## Phase 6 — Background research (14:26–14:28)

37. Web search "Quip Network mainnet launch date QUIP token TGE 2026" -> aggregator articles: mainnet/TGE targeted Q2 2026, then delayed; TGE date not announced; points/airdrop campaign ongoing.
38. Web search "Postquant Labs Quip audit SHRINCS hashsigs security audit" -> CoinDesk 2026-04-28 (Bitcoin wallet on Arch), Oak Security audit mentioned for QuipSwap.
39. hashsigs-rs SECURITY.md + CHANGELOG.md: references "external audit issue oak-sol-02/03/06/09". No audit report linked from developers.quip.network.
40. https://cryptorank.io/price/quip-network -> WebFetch 403 (couldn't verify listing).
Finished: Mon 28 Sep 2026 14:28:06 CEST
