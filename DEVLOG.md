# DEVLOG — Quip Network evaluation

Running log of pages visited (in order), what I was looking for, commands run, errors.
Simulated technical PM at a crypto wallet company.
Start: 2026-09-28 · Time budget: ~75 min

## Session log (in order)

1. `web_search "Quip Network crypto"` (limit 10).
   Looking for: official site + docs. Got: quip.network, quip.gitbook.io/docs,
   X @quipnetwork, cryptorank, Yahoo/PRNewswire, Medium, Product Hunt, CCN, Messari.
2. Browser → `https://quip.network/` — loaded OK.
   Products: Consumers / Operators / Enterprises / Developers; "Post-quantum asset
   protection". Nav: Points, Use Cases, Docs (→ developers.quip.network/docs),
   Blog, Contact, Run a Node (→ docs/nodes/run-a-node-testnet),
   Deposit & Earn (→ account.quip.network). Footer: QuipSwap, QVRF, Whitepaper PDF,
   Security Audit (oak-security GitHub), GitHub, Discord, Telegram, X, Farcaster.
   Claim on page: "Over 20,000 wallets are already deployed."
3. NOTE: search result #2 `quip.gitbook.io/docs` → browser shows
   "Content owner not found". Dead. Live docs moved. (FRICTION #1)
4. Browser → `https://developers.quip.network/docs` — Mintlify SPA, needed ~13 s to
   render (first innerText read was empty; `wait_for_load` also threw a 5 s CDP
   timeout). Sections: Overview / Getting Started / Quip Interlock Protocol /
   Compute / Basics / Network / Nodes / XQuad toolchain.
   Docs offer `.md` mirrors + `/llms.txt` + `/llms-full.txt`.
5. `js fetch(llms.txt)` → CDP timeout; switched to `web_extract` for docs pages.
6. `web_extract` docs: llms.txt, quip-sdk, submit-a-job, what-is-quip,
   run-a-node-testnet, network/token, quip-accounts, quipswap, qvrf, participants,
   miners, xquad-toolchain, how-quip-fits-together, quip-lifecycle,
   ising-topologies, use-with-ai, quip-the-quantum-unit-interlock-pathway,
   basics/motivation. `basics/key-properties.md` came back empty (gave up).
7. Registry verification (terminal, curl):
   - npm `@quip.network/ethereum-sdk` latest=0.1.7 / beta=0.3.0-beta.8
   - npm `@quip.network/hashsigs-wasm` latest=0.1.0-rc1 / rc=0.2.1-rc9
   - npm `@quip.network/hashsigs` latest=0.1.0 ; `...-solidity` latest=0.1.0
   - PyPI `xquad` 0.4.1, `xqsa` 0.4.1 (both requires_python >=3.13)
   - crates.io `hashsigs-rs` 0.2.1-rc9 (2,644 downloads)
   - Concluded: `@quip.network/sdk` and `@quip.network/quip-swap` do not exist.
8. `web_search "Quip Network mainnet launch 2026"` → DuckDuckGo "No results found" (x2).
9. Browser → `https://quip.network/blog` — post list. Dates: 2026-04-02 testnet live;
   2026-04-28 Bitcoin PQ wallets; 2026-09-01 QuipSwap live + the cost explainer;
   2026-09-11 QVRF live. **No mainnet announcement for the L1.**
10. `web_extract` blog: testnet-is-live, what-is-quip-network, the cost explainer,
    quipswap-launch. `web_extract` quip.network/use-cases/digital-assets/ and
    github.com/oak-security/audit-reports/tree/main/Quip →
    "2026-09-24 Audit Report - Quip v1.0.pdf" is public.
11. `uv python install 3.13` → 3.13.13. `uv venv --python 3.13 .venv`.
    `python -m ensurepip` (uv venv has no pip), then
    `pip install "xquad[quip]"` → pulled xquad/xqsa/xqffi/xqcp/xqvm-py 0.4.1,
    quip-signer 0.3.0, substrate-interface 1.8.1, smoldot-light, scalecodec.
12. Ran the docs' local example verbatim (`first_job_local.py`) → OK, energy -1.
13. `probe.py`: confirmed `set_quadratic(0,1,2)` really does add a quadratic term
    (the docs' printed sample repr had confused me). (FRICTION #6)
14. `quip_job.py`: docs' `SolverQuip(url="", keystore=...)` →
    `ValueError: A Quip RPC URL is required. Pass url= or set QUIP_RPC_URL.`
    So a URL is mandatory and the docs had provided none.
15. `web_search "quip.network testnet node rpc wss endpoint connect"` → found
    `github.com/QuipNetwork/nodes.quip.network` and a ChainList entry for
    "Aglais Testnet (Quip Network)".
16. Browser → chainlist entry → dead ("nope"). `web_extract` → 404.
17. `web_extract` `github.com/QuipNetwork/nodes.quip.network` → **Aglais relaunch
    2026-09-02**, fresh genesis, runtime 117, tx version 7, token AGLS, faucet
    `faucet.aglais.quip.network`, port 20049 is the canonical API port.
    Also `web_extract` `github.com/quipnetwork` → org repos (quip-miner,
    ethereum-sdk, cpp-sdk, hashsigs-*, quip-validator, quip-node-manager, xquad…).
18. Terminal: probed candidate hosts. `faucet.aglais.quip.network` 404 on GET /,
    `aglais.quip.network` 200. `cpu-1.nodes.quip.network` does not resolve (an
    example value in the README). GitLab links from the docs all return 200.
19. GitLab API: group `quip.network` has ~43 projects, incl. `chainlist`,
    `explorer.quip.network`, `dashboard.quip.network`, `faucet`, `xquad`,
    `quip-validator` — mostly mirrored to GitHub.
20. `curl https://aglais.quip.network` → **the jackpot page**: chain details.
    - Substrate public RPC `wss://bootnode-{1-3}.aglais.quip.network:20049/rpc`
    - EVM JSON-RPC `https://evm-rpc.aglais.quip.network:20049`, chain id 20033
    - Genesis `0x59e064…c286`, token AGLS (12 dec native / 18 dec EVM)
    - Faucet `POST /request` → 10 AGLS, curl-only (refuses browsers)
    - Explorers: Blockscout + Subscan; live block height ~376k
    This directly contradicts the docs' "connection details … not published".
    (FRICTION #2)
21. `SolverQuip(url="wss://bootnode-1.aglais.quip.network:20049/rpc",
    keystore="keys/testnet.json")` → constructed; `keys/testnet.json` auto-created
    by the SDK (scheme `hybrid-falcon512`, account id
    `0x26c6f573f4f58d8567a5b4a6193915aae5f6a972e75d5eaf36ad001238d0a696`).
    Derived SS58 (prefix 42, blake2b checksum): `5CwYnBoDTBrCSbTDUkj2BBs55j6DvQYt1TUubTEJTBUw8BFD`.
22. Terminal: `curl -X POST https://faucet.aglais.quip.network/request -d
    '{"dest":"0x26c6…a696"}'` → 200, 10 AGLS,
    `extrinsic_hash 0x616821e94ced942bbd1c53563e003f5d181c9e8b5a35a991ab216cee09864001`.
    Second call immediately after → 429 "rate limited".
23. `status.py` → inspected the SDK surface: `solve`, `quote`, `query`, `status`,
    `for_network`. `status(order_id)`.
24. `job_net.py` → `quote()` printed reward 1 AGLS / fee 0.001896569299 AGLS /
    balance 10 AGLS; `solve()` returned an answer. A UserWarning appeared about
    coefficients outside the topology's allowed-value set (advisory only).
25. `job_net2.py` → metadata: `order_id 125`, solver
    `5DXr9LokuLE5bs2ZZyhDwbJfR9SqceL7kohQbgMebDcymhfD`, `best_energy_milli -1000`,
    `energy_matches_chain True`, `num_submissions 3`, timing 69.4 s.
    Balance 10 → 7.996206861402 AGLS after two jobs.
26. `chaincheck.py` with `substrate-interface` → chain `AGLS (Quip Testnet)`,
    ss58 42, but `System.Account` failed:
    `Index '16' not present in Enum type mapping` (runtime newer than the client).
    Fallback evidence: `quote()` before/after + exact per-job debits. (FRICTION #10)
27. Global HTTP probe: EVM RPC `eth_chainId` = `0x4e41`, `eth_blockNumber` OK;
    `discord.com/api/v10/invites/quipnetwork` 200; `hello.quip.network`,
    `points.quip.network`, `quip.network/quipswap/` all 200;
    `nodes.quip.network` does not resolve.
28. `web_extract` `github.com/QuipNetwork/ethereum-sdk` → README: networks list
    (Sepolia/Base Sepolia/OP Sepolia **and mainnet/Base/Optimism**), contract
    addresses, and the notice **"not yet ready for production use"**.
29. Terminal `eth_getCode` on public RPCs → Deployer `0xF768…90b5`, WOTSPlus
    `0x1Ad0…8991`, QuipFactory `0x4a5A…bB99` **all have bytecode on Ethereum and
    Base mainnet** (llamarpc returned HTTP 525; switched to publicnode).
30. `web_extract` quipswap page + links.quip.network + vault.quip.network →
    QuipSwap "Launched and live on Base"; order book + extension "Coming soon";
    vault = "quantum-safe account (currently in beta)"; links page still points
    at the dead gitbook for Nodes/Documentation.
    `web_search` for the QUIP token → crypto rank listings, a Jupiter SPL "QUIP"
    with +49,065% 24 h, an Etherscan "QuantumQuip (QUIP)" — but
    points.quip.network says points are "paid out in $QUIP at TGE" ⇒ no token yet.
31. Homepage keyword scan (terminal regex over raw HTML) → "Live on testnet …
    20,000+ quantum-resistant wallets deployed … $1M+ quantum-protected value",
    and "resell excess capacity at spot rates **when mainnet launches**".
    ⇒ L1 mainnet not launched.
32. `evidence_job.py` final clean run → `order_id 128`, same solver,
    `energy_matches_chain True`, timing 72.9 s, balance
    7.996206861402 → 6.994310292103 AGLS (exact debit 1.001896569299 = reward+fee).
    Captured to `evidence_job.txt`.
33. Wrote EVALUATION.md, RESULT.md, FRICTION.md, this DEVLOG.

## Environment / artefacts

- cwd `/private/tmp/devtrials4/h5-deepseek-v4-flash`; host Python 3.9.6 → used
  `uv` to install CPython 3.13.13 into `.venv` (xquad needs ≥3.13).
- `keys/testnet.json` — throwaway testnet keystore created by the SDK for this
  evaluation only. No existing keys were touched, no mainnet transactions made.
- Scripts: `first_job_local.py`, `probe.py`, `connect.py`, `addr.py`, `status.py`,
  `quip_job.py`, `job_net.py`, `job_net2.py`, `chaincheck.py`, `evidence_job.py`,
  `evidence_job.txt`.
- Tooling issues encountered on my side (not vendor bugs): browser CDP
  `Runtime.evaluate` 5 s timeouts on `developers.quip.network` and
  `account.quip.network`; one inline shell command was rejected by the local
  command guard and had to be rewritten as a script.

## Verification commands worth keeping

```bash
# registries
curl -s https://registry.npmjs.org/@quip.network%2Fethereum-sdk | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['dist-tags'])"
curl -s https://pypi.org/pypi/xquad/json        | python3 -c "import sys,json;print(json.load(sys.stdin)['info']['version'])"

# testnet
curl -s -X POST https://evm-rpc.aglais.quip.network:20049 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'          # -> 0x4e41
curl -s -X POST https://faucet.aglais.quip.network/request -H 'content-type: application/json' \
  -d '{"dest":"<your_account_id>"}'                                        # -> 10 AGLS

# mainnet asset-layer contract presence
curl -s -X POST https://ethereum-rpc.publicnode.com -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["0x4a5A444F3B12342Dc50E34f562DfFBf0152cBb99","latest"]}'
```
