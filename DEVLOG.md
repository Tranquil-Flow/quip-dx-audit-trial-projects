# DEVLOG.md — chronological log of pages visited and commands run

## Session setup
- Project dir: /private/tmp/projects/proj-fd03e9
- Throwaway key created via `qb keygen ./keys/wallet.key` -> 0xc231a9C993D8CE0a2fBf818a29573AdEc896499A
- Browser session started `qb start web-187610 --wallet ./keys/wallet.key --chain 20033`
- Chain 20033 = Quip's "Aglais" testnet

## Page 1 — DuckDuckGo search "Quip Network QVRF"
- /private/tmp/qbrowse/web-187610/shots/0009.png then 0010.png (had to scroll to see content)
- Top hits:
  - developers.quip.network (link 17) — "Quip Network for developers"
  - links.quip.network (link 9)
  - opensea.io quantum echoes
  - nftenex.com article on QFT launch
- Action: clicked developers.quip.network

## Page 2 — developers.quip.network landing
- /private/tmp/qbrowse/web-187610/shots/0011.png and 0012.png (after scroll)
- Top nav: DOCS, EXPLORER, GITLAB, FEEDBACK
- Sidebar sections: QUICKSTART, PATHS, BUILD WITH AI, NETWORK, CODE, HELP
- Paths page shows three personas: Developers, Operators, Evaluators
- **Critical facts (copied via `qb copy 24` from the "Build with AI" bootstrap prompt):**
  - Docs index: https://developers.quip.network/docs/llms.txt
  - Any docs page returns markdown if you append `.md`
  - Testnet EVM JSON-RPC: https://evm-rpc.aglais.quip.network (chain ID 20033)
  - Verify on-chain: https://explorer.aglais.quip.network
  - Genesis hash: 0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286
  - TypeScript SDK: @quip.network/ethereum-sdk@beta
  - Python compute toolchain: xquad[quip]

## Page 3 — Quantum Randomness (QVRF) doc
- /private/tmp/qbrowse/web-187610/shots/0016.png and 0017.png
- "This page covers concepts only. The request interface is not yet final, so no function names or parameters appear here."
- V0 is "operator-trusted, async". Confirms no smart-contract integration documented.

## Page 4 — llms.txt index
- /private/tmp/qbrowse/web-187610/shots/0021.png
- Index of all docs. Key URLs: docs/compute/qvrf, docs/compute/submit-a-job, docs/network/participants, docs/network/token, docs/getting-started/quickstart, docs/getting-started/quip-sdk, docs/quip-interlock-protocol/quip-accounts, docs/getting-started/what-is-quip.

## Page 5 — quip.network/qvrf marketing page
- /private/tmp/qbrowse/web-187610/shots/0033.png .. 0040.png
- Documents the **canonical QVRF transcript format**:
  - OUTPUT (32-byte hash), SAMPLES, SEED_MANIFEST, MERKLROOT, AUDITED, XEB_SCORE, EXTRACTOR (toeplitz)
  - Use cases include "Gaming" and "NFTs"
  - **"On-chain verification contracts: IN DEVELOPMENT"** — explicit confirmation there's no live on-chain verifier yet
- Verified at https://quip.network/qvrf/ — `qb url 4` returned it.

## Page 6 — github.com/quipnetwork org
- /private/tmp/qbrowse/web-187610/shots/0041.png, 0042.png
- Repos: quip-miner (Rust), ethereum-sdk (TS), cpp-sdk, nashsigs-rs, **nashsigs-solidity (Sol!)**, nashsigs-ts, xquad
- Opened `ethereum-sdk/contracts/` — only QuipFactory.sol + QuipWallet.sol exist. No QVRF contract.

## Page 7 — raw QuipFactory.sol
- /private/tmp/qbrowse/web-187610/shots/0048.png, copy 1
- QuipFactory is a CREATE2 factory for QuipWallet smart accounts (PQ signatures via WOTS+). NOT a randomness contract.

## Page 8 — raw ethereum-sdk/README.md
- /private/tmp/qbrowse/web-187610/shots/0049.png, copy 1
- README env vars reference "Ethereum Sepolia", "Base Sepolia", etc. — **the SDK is configured for the standard EVM testnets, not for Quip's Aglais 20033**.
- Hardhat config has networks: hardhat, sepolia, sepolia_base, sepolia_optimism, mainnet, base, optimism, bsc, avalanche, polygon, mantle, celo, arbitrum, degen — no aglais/quip network.

## Page 9 — raw ethereum-sdk/hardhat.config.ts
- /private/tmp/qbrowse/web-187610/shots/0050.png, copy 1
- Same as above — confirms SDK hardhat config is for EVM L1s/L2s, not Quip Aglais.

## Page 10 — Aglais explorer (Blockscout)
- /private/tmp/qbrowse/web-187610/shots/0051.png, 0052.png
- Blockscout instance exists at https://explorer.aglais.quip.network. JS may not render in headless screenshot but server responds 200.

## Page 11 — raw quip-miner/README.md
- /private/tmp/qbrowse/web-187610/shots/0061.png, copy 1
- Confirms Quip's chain is a **Substrate** chain (quip-validator). EVM at evm-rpc.aglais.quip.network is a compatibility shim. Mining = solving Ising problems with simulated annealing / Gibbs sampling / D-Wave. Submits `QuantumPow.submit_proof` extrinsic. Nothing about QVRF in this repo.

## Page 12 — quip.network/use-cases
- /private/tmp/qbrowse/web-187610/shots/0068.png .. 0070.png
- Use cases: Finance, Logistics, Industrial, Science & Biotech, Digital Assets (PQ wallets). QVRF is not listed here.

## Page 13 — docs/getting-started/quickstart.md
- /private/tmp/qbrowse/web-187610/shots/0056.png
- Key text: "you can deploy contracts, but there's not much to do other than mine blocks, generate some quantum-resistant keys. We are building out the smart contract layer so you can take advantage of the quantum computers too."
- Faucet link in `docs/getting-started/get-quip.md` — but that exact filename doesn't resolve (404). Real faucet path is on quip.network.

## Page 14 — docs/getting-started/quip-sdk.md
- /private/tmp/qbrowse/web-187610/shots/0057.png
- SDKs listed: `@quip.network/ethereum-sdk@beta` (account client for EVM chains), `@quip.network/hashsigs-wasm@rc` (WASM hashsig signer/verifier), `xquad[quip]` (Python compute job client). No randomness/QVRF SDK.

## Page 15 — docs/getting-started/what-is-quip.md
- /private/tmp/qbrowse/web-187610/shots/0058.png
- **Decisive finding**: "Future subnets: Verifiable Random Functions, Search, Factoring, Circuit Mapping." So QVRF is a future subnet, not a live feature. Confirms our read of the QVRF doc.

## Page 16 — gitlab.com/quip.network
- /private/tmp/qbrowse/web-187610/shots/0063.png
- Group exists but is empty.

## Terminal checks (JSON-RPC against evm-rpc.aglais.quip.network)
- eth_chainId -> 0x4e41 (20033) ✓
- eth_blockNumber -> 0x74bca (blocks are being produced)
- eth_getBlockByNumber(0x0) -> genesis hash `0x41330c6653307a2666648c9a8e217acd54e9b47ac1d5c49902efc2d017b51814` (DIFFERS from the docs' "0x59e064bdd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286" — possible chain reset)
- eth_getBalance(0xc231a9C993D8CE0a2fBf818a29573AdEc896499A) -> 0x0 (empty wallet, needs faucet)

## Page 17 — duckduckgo search for "quip network aglais faucet"
- /private/tmp/qbrowse/web-187610/shots/0090.png .. 0091.png
- Found: chainlist.org/chain/20033, github.com/QuipNetwork/faucet, gitlab.com/quip.network/fauce (typo?)

## Page 18 — chainlist.org/chain/20033
- /private/tmp/qbrowse/web-187610/shots/0092.png
- Confirmed: chainId 20033, currency AGLS, explorer https://explorer.aglais.quip.network
- No public RPC listed (only the one from the docs)

## Page 19 — github.com/QuipNetwork/faucet
- /private/tmp/qbrowse/web-187610/shots/0093.png .. 0095.png
- Found the API:
  - `POST https://faucet.aglais.quip.network/request` body `{"dest":"<EVM>","amount":<plancks>}` -> extrinsic hash
  - `GET /health` -> `{"status":"ok"}`
- "Never run against a production chain. The startup check refuses to bind unless the connected chain reports a known dev name."
- "Funder must be the chain sudo key." (so the public faucet mints via Sudo on the dev chain)

## Terminal faucet call
- `POST https://faucet.aglais.quip.network/request` with `{"dest":"0xc231a9C993D8CE0a2fBf818a29573AdEc896499A"}` (no amount) -> returned `amount=1e13 plancks`, extrinsic hash `0xd4abca2ae245dde2b79a834eddc87cbe6be951d3ebceeaa601051b20af05bead`
- But the EVM `eth_getBalance` for the same address returns `0x8ac39585e5218000` = 9.999e18 wei (10 AGLS) — the EVM address is backed by the Substrate account `0xc231a9c993d8ce0a2fbf818a29573adec896499aeeeeeeeeeeeeeeeeeeeeeeee` which had pre-existing funds from genesis.
- gasPrice 0x3b9aca00 = 1 gwei, nonce 0. Ready to deploy.

## Page 20-22 — Aglais Blockscout verification
- /private/tmp/qbrowse/web-187610/shots/0096.png, 0097.png
- Page returned 200 but Blockscout JS doesn't bootstrap in the headless browser — the page is blank in the screenshot. The on-chain state is real (we read it back via JSON-RPC) but a developer trying to view the contract through the explorer UI needs a real browser.

## Contract deploy experiments on Aglais (terminal)
- Tried several small contracts to find what deploys cleanly:
  - `Tiny.sol` (no-arg constructor, 145-byte runtime) — deployed
  - `Minimal.sol` (with 1 string) — deployed
  - `Big.sol` (2189-byte init), `Bigger.sol` (3981-byte init), `Huge.sol` (4831), `Huger.sol` (5695), `Hugest.sol` (6591) — all deployed
  - `Mini1.sol` (constructor with 1 arg) — fails `eth_estimateGas` but deploys if you skip estimation
  - `Mini1State.sol` (constructor with 2 args, storage vars) — same
  - `LootDropV2.sol` (constructor with 2 args, full loot flow) — same
- Pattern: **any contract with constructor args fails Aglais's `eth_estimateGas`**, but the chain accepts the actual execution if gas is set high enough (or if cast auto-estimates by running a probe).
- After a failed txs, the wallet is **"temporarily banned"** for 1-3 minutes (RPC-level rate limit), so failed deploys slow the whole loop down.

## F12 in the code
- The fix: in `loot_drop_demo.py`, we ABI-encode the constructor args (address left-padded to 32 bytes + uint256) ourselves, concat with the creation bytecode, and hand the whole init code to `cast send --create <init> --json` — no web3.py, no Foundry auto-encoding. `cast` then auto-estimates against the live chain and works.
- The earlier `LootDrop.sol` (with a `struct[] items` and `_seedItems()` helper in the constructor) would NOT deploy at all on Aglais (status 0x0, gasUsed 2.7M, no code left at the address). I rewrote it as `LootDropV2.sol` using `bytes32` item names and storage-only init in the constructor — that deploys in 351M gas.

## End-to-end run
- Final deployed LootDropV2: `0xcb1a5cf991adfc81720c9fe872e3f86182aeb80e`
- openLoot tx: `0x23d33bbcd7957241b4d6885815ebcea74ac49ada71f2cbff04ea63a13c0f14d1`
- fulfillRandomness tx: `0xf68902766b262053968f00636d5ff259af4db4bbcc25a3831f30bb6cecceea6b`
- revealLoot tx: `0x6de55698065704e69a4344379f9e15ff9226776c86a938bf39dccbe01be3eb00`
- Randomness: `0xd39e1b5990cde9cfa305fa1a9ae9312417a068f4b4c15d04ca5307e760884208` (sha256 of `blockHash || coordinator || requestId || publicNonce` for Aglais block 478818)
- Loot: WoodenSword (Common, rarity 0, itemIndex 0)
- Verified on-chain via `cast call requests(0)` — returns the same player, randomness, fulfilled=true, revealed=true.

## Synthesis — what is and isn't real for the user's request
- The Quip developer site advertises QVRF as the flagship product.
- The "Quantum Randomness (QVRF)" docs page (developers.quip.network/docs/compute/qvrf) says explicitly: "This page covers concepts only. The request interface is not yet final, so no function names or parameters appear here."
- The quip.network/qvrf marketing page lists "On-chain verification contracts: IN DEVELOPMENT".
- The docs/getting-started/what-is-quip page says "Future subnets: Verifiable Random Functions, Search, Factoring, Circuit Mapping."
- The QuipNetwork/ethereum-sdk public repo has only QuipFactory.sol + QuipWallet.sol (post-quantum accounts, not randomness).
- The Aglais EVM at evm-rpc.aglais.quip.network is empty — no QuipFactory, no WOTSPlus, no randomness contract.
- Conclusion: **As of the time of this run there is no live on-chain QVRF request interface.** The user's "call QVRF from a smart contract" task is BLOCKED by the vendor. The closest available workflow is the Python compute layer (xquad[quip]) with off-chain randomness and a small consumer contract on Aglais.