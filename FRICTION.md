# FRICTION

Items where a real person would be confused, misled, stuck, or annoyed.
Format: URL · element/quote · expected · actual · time cost.

---

## #1 — Docs root 404
- URL: https://quip.gitbook.io/docs
- Element: the entire page (returned body is empty/error)
- Expected: a documentation landing page where I can browse all sections (nodes, SDKs, deploy, EVM, etc.).
- Actual: 404 "page not found". Had to search blindly for sub-pages.
- Time cost: ~1 min, but slowed the first step.

## #2 — The real docs URL is not linked from anywhere obvious
- URL: https://quip.gitbook.io/docs (404) vs https://developers.quip.network/docs (real)
- Element: The quip.network homepage links the "Read the docs" button to https://quip.gitbook.io/docs which 404s. The actual docs live at https://developers.quip.network/docs (also reachable via docs.quip.network → 301).
- Expected: Either site should work.
- Actual: The marketing site footer/CTA points at a broken URL. I only found the working one by guessing the subdomain pattern after seeing the format used elsewhere.
- Time cost: ~3 min hunting for the right URL. A user who only reads the docs button on the homepage will get stuck.

## #3 — "Compute-Consensus Layer" vs "Asset Layer" — what do they mean for me?
- URL: https://quip.network/
- Element: "Quip is **not** a single blockchain or a single quantum computer." "Compute-Consensus Layer ... is a new Nakamoto-style chain ...". "Asset Layer ... a post-quantum wrapper you deploy *on any existing chain*".
- Expected: A single testnet chain I can point MetaMask/Hardhat at with chainId + RPC.
- Actual: Quip has both an L1 (substrate, "Aglais" testnet) AND a set of contracts on existing EVM chains (the Asset Layer). The developer docs lead with Asset Layer because that's where the wallet code lives. As a Solidity dev, this is genuinely confusing — am I supposed to deploy on Quip L1, or on Ethereum via the Asset Layer wrapper? It takes real work to learn that BOTH work.
- Time cost: ~5 min misdirection before realizing the L1 also runs pallet-revive.

## #4 — No "smart contracts" / "Deploy an ERC-20" section in the docs
- URL: https://developers.quip.network/docs/getting-started/quickstart, /nodes/run-a-node-testnet, all of the sidebar
- Element: docs only talk about mining, nodes, wallets, post-quantum signing. No "Deploy an ERC-20 on the Quip testnet" or "write a smart contract" page.
- Expected: A "Smart Contracts" or "EVM on Quip" section explaining how Solidity devs use pallet-revive.
- Actual: No such page exists. I had to read `runtime/Cargo.toml` in the validator repo to discover `pallet-revive` is included.
- Time cost: ~10 min — went down the "Quip only supports PSP-3 / no smart contracts" path before finding the runtime deps.

## #5 — "EIP-155 20033" but no public RPC URL listed in the validator README
- URL: https://github.com/QuipNetwork/quip-validator README
- Element: "Omit `--chain` to join the live public Quip Testnet (EIP-155 `20033`)." and "Three canonical bootnodes (`bootnode-{1,2,3}.aglais.quip.network`) are embedded in the chain spec".
- Expected: An HTTP/WS RPC URL like `https://rpc.testnet.quip.network:9944` to point MetaMask/Hardhat at.
- Actual: Only libp2p bootnodes listed. Probing them on 9944/9933 returns "connection timed out". The public RPC URL (`https://evm-rpc.aglais.quip.network:20049`) is not on quip.network or the validator repo — only on chainlist.org and the Aglais landing page (`agls.quip.network`, which is also not linked from quip.network).
- Time cost: ~5 min before I searched the web and found it via chainlist.org.

## #6 — `chain_spec.rs` says the native token is AGLS / 12 decimals / SS58=42, but the EVM side says 18 decimals
- URL: https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/node/src/chain_spec.rs
- Element: `p.insert("tokenDecimals".into(), 12.into());` — Substrate-native decimals = 12.
- Element: https://chainlist.org/chain/20033 — `"nativeCurrency":{"decimals":18}` — EVM decimals = 18.
- Expected: One source of truth.
- Actual: The Substrate chain spec uses 12 (PSP-34 convention); the EVM RPC presents the same native asset at 18 decimals via the `NativeToEthRatio = 10^(18-12)` setting in the runtime (line 1078). When I check `cast balance` and divide by 1e18 I get sensible AGLS; if I'd naively used `1e12` I'd have been off by 6 orders of magnitude.
- Time cost: ~1 min once noticed; would have been much longer if I'd tried to "value" a balance wrong.

## #7 — Token name mismatch (AGLS, not QUIP) vs the docs
- URL: https://developers.quip.network/docs/network/token
- Element: "Ticker: $QUIP"
- Element: chain_spec.rs + chainlist.org: token symbol is **AGLS**.
- Expected: $QUIP everywhere.
- Actual: The Aglais testnet runs a token called AGLS (no real-world value per their docs), while $QUIP is the eventual mainnet token. Docs are quietly about mainnet while the testnet uses a different symbol. Easy to miss.
- Time cost: ~1 min.

## #8 — `forge send` is not in this Foundry build
- URL: n/a (terminal)
- Element: `forge send --help` → "unrecognized subcommand 'send'"
- Expected: Foundry's standard `forge send <to> <sig> [args]` for one-off contract calls.
- Actual: This Foundry build (1.5.1-stable) doesn't have `forge send`. Had to use `cast send`, which has a different flag set (`--priority-gas-price` / `--gas-price` rather than `--max-fee-per-gas`).
- Time cost: ~30 s.

## #9 — pallet-revive mints revert with status=0 at default 2M gas limit (no revert reason)
- URL: n/a (terminal + explorer)
- Element: `cast send ... --gas-limit 2000000 ... mint(...)` → tx included, receipt `status: 0 (failed)`, `revert_reason: null` on Blockscout, no event logs.
- Expected: A clear error message ("out of gas" or "execution reverted: ...").
- Actual: Silent revert. `cast run`/`debug_traceTransaction` showed a Transfer event and "Transaction successfully executed", which misled me into thinking the tx had actually succeeded and only the receipt reporting was wrong. **It hadn't**. The trace replay simulates from the current (post-revert) state, so the event appears even though no state change stuck. The fix: bump `--gas-limit` to ≥6M. Other users' successful mints on this chain used ~5M gas; my 2M was simply too low. This is documented nowhere.
- Time cost: ~15 min of confused debugging before I compared my failed tx against other people's successful ones in the Blockscout tx feed.

## #10 — `cast storage` returns 0 for pallet-revive contracts (separate trie)
- URL: n/a (terminal)
- Element: `cast storage 0xTOKEN 2` → 0x0...0 even after a confirmed-issuance tx.
- Expected: Read the contract's `totalSupply` storage slot.
- Actual: pallet-revive stores contract state in a separate trie, not the EVM account storage. `cast storage` reads the wrong location. `cast call` (which goes through pallet-revive's RPC adapter) returns the right value. Cast could swallow the user here.
- Time cost: ~2 min, but only because I had Blockscout corroboration; would have been worse otherwise.

## #11 — The on-chain `pallet-faucet-ops` is `Root`-only; the actual user-facing faucet is a separate HTTP service
- URL: https://raw.githubusercontent.com/QuipNetwork/quip-validator/main/pallets/faucet-ops/src/lib.rs
- Element: `ensure_root(origin)?;` — every dispatchable requires Root origin.
- Expected (when first reading): "I need the operator's root key to fund my account."
- Actual: The chain also runs an HTTP faucet at `https://faucet.aglais.quip.network/request` that mints to whatever address you ask for. They're different systems with the same name. The on-chain pallet is for operators; the HTTP faucet is for users. This is not explained in the docs.
- Time cost: ~3 min before I went looking and found the HTTP faucet via the Aglais landing page.

## #12 — "Connection details for the public test network have not been published yet"
- URL: https://developers.quip.network/docs/compute/submit-a-job.md
- Element: "Connection details for the public test network have not been published yet, so this page cannot include a node address."
- Expected: Either they actually aren't published, or — more likely — published somewhere else.
- Actual: They are published, just not on the docs compute page. The right place is the Aglais landing page (`agls.quip.network`) and the `nodes.quip.network` site (which currently errors out at the cloud LB). This sentence is plain wrong or stale; it's the most confusing thing in the docs for an incoming developer.
- Time cost: ~5 min misdirection.

## #13 — explorer `tx` page doesn't decode transactions where the contract isn't verified
- URL: https://explorer.aglais.quip.network/tx/<hash>
- Element: `decoded_input: null`, `revert_reason: null` even though `method: "mint"` is detected.
- Expected: A clear revert reason (e.g. `Error("InsufficientAllowance()")`) so I can see why my tx failed without re-running `cast run`.
- Actual: No revert decoding. For an unverified contract, you only get `status: error` and have to guess. Verified contracts would decode properly. Self-service verification via the Blockscout API on this deployment was not obviously reachable from the UI (or I missed it).
- Time cost: ~10 min trying to extract a revert reason from the failed tx.