# DEVLOG

Goal: find Quip Network developer docs and build a small working hackathon demo.

## Pages visited (in order)

1. https://duckduckgo.com/ — search for "Quip Network developer docs"
   Screenshot: /private/tmp/qbrowse/v7-mimo-v2.5/shots/0001.png (homepage), 0002-0004 (typed query, submitted)
   Outcome: BLOCKED by bot CAPTCHA ("Select all squares containing a duck"). The CAPTCHA
   image grid has no qb-clickable numbers, so I could not solve it. Abandoned DDG.

2. https://www.google.com/search?q=Quip+Network+developer+docs
   Screenshot: 0006.png
   Outcome: BLOCKED by Google "sorry" CAPTCHA redirect. Abandoned Google.

3. https://www.bing.com/search?q=Quip+Network+developer+docs
   Screenshot: 0007.png
   Outcome: WORKED. But results were Salesforce Quip (quip.com), a toothbrush company
   (getquip.com), and Wikipedia. Not the blockchain.

4. https://www.bing.com/search?q=%22Quip+Network%22+blockchain+developer
   Screenshot: 0008.png
   Outcome: Same irrelevant results. The project is not well indexed on Bing.

5. https://www.bing.com/search?q=Aglais+testnet+blockchain
   Screenshot: 0009.png
   Outcome: Zero results.

6. https://github.com/search?q=quip+network&type=repositories
   Screenshot: 0010.png
   Outcome: JACKPOT. Found QuipNetwork org repos: quip-miner (11.6k stars, Rust),
   quip-node-manager, xquad, xq-py. Topic tags: quantum, ising-model, quantum-computing.

7. https://github.com/QuipNetwork
   Screenshot: 0011.png
   Outcome: Org page with 40 public repos. Key finding: official website link
   https://quip.network. Notable repos: ethereum-sdk (TS), cpp-sdk, nashsigs-* (post-quantum
   signatures in Rust/Solidity/TS).

8. https://quip.network/
   Screenshot: 0012.png, 0013.png (after clicking Docs nav link — didn't navigate, is a
   regular anchor; used `qb url` to get the real destination)
   Outcome: Marketing homepage. "The worldwide quantum computer". Nav: Points, Products,
   Use Cases, Docs, Blog, Contact, Run a Node, Deposit & Earn. The Docs link resolves to
   https://developers.quip.network/docs (found via `qb url 5`).

9. https://developers.quip.network/docs
   Screenshot: 0014.png
   Outcome: Docs home. Sections: OVERVIEW, GETTING STARTED (Quickstart, What is Quip
   Network?, Quip SDK, Use These Docs with AI), QUIP INTERLOCK PROTOCOL, COMPUTE (Submit
   Your First Compute Job, Quantum Randomness (QVRF), Ising Topologies), BASICS.

10. https://developers.quip.network/docs/getting-started/quickstart
    Screenshots: 0015.png, 0016.png (scrolled)
    Outcome: Two tasks: run a node (Quip Node Manager desktop app) or generate
    quantum-resistant keys. Libraries: WOTS+ hash signatures in Rust, C++, TypeScript,
    Solidity. Interface at account.quip.network.

11. https://developers.quip.network/docs/getting-started/quip-sdk
    Screenshots: 0017.png, 0018.png, 0019.png (scrolled)
    Outcome: Install commands:
      npm install @quip.network/ethereum-sdk@beta        (EVM account client)
      npm install @quip.network/hashsigs-wasm@rc         (SHRINCS hash sigs, WASM)
      pip install "xquad[quip]"                          (Python: model building + job submission)
    Packages that do NOT exist: @quip.network/quip-swap, @quip.network/sdk.
    Legacy: @quip.network/hashsigs, -solidity, hashsigs-cpp, hashsigs-rs.
    Warning noted: the `latest` npm tag resolves to outdated 2025 builds; use @beta/@rc.

12. https://developers.quip.network/docs/compute/submit-a-job
    Screenshots: 0020.png – 0025.png (scrolled through full page)
    Outcome: THE key page. Full flow: install tools -> describe problem as Ising model ->
    fund from faucet -> submit. Code captured:
      from xqmx import XQMX            (NOTE: this import does not work — see FRICTION)
      from xqsa import SolverDWaveCPU, SolverQuip
      model = XQMX.binary_model(size=4)
      model.set_linear(0, -1)
      model.set_quadratic((0, 1, 2))   (NOTE: tuple form does not work)
      result = SolverDWaveCPU().solve(model)     # local
      solver = SolverQuip.for_network("aglais", keystore="~/.quip/keystore.json")
      result = solver.solve(model)               # network
      quote = solver.quote(model)                # cost preview
    Faucet: curl -X POST https://faucet.aglais.quip.network/request
      -H 'Content-Type: application/json' -d '{"dest": "<your address>"}'
    Job cost: min 1 AGLS reward + small fee; 1 AGLS = 1e12 planck; AGLS free from faucet.
    Coefficients travel as integer thousandths; finer than 1e-3 or >2,147,483 rejected.
    Network endpoints published at aglais.quip.network.

## Commands that mattered

- pip install "xquad[quip]" (into .venv with python3.13)
- Python exploration: `from xqsa.solver import XQMX` (docs say xqmx — wrong),
  XQMX.spin_model(size=10), set_quadratic(i, j, value) (not tuple),
  XQMXDomain.BINARY/SPIN, NETWORKS['aglais'] = rpc wss://bootnode-1.aglais.quip.network:20049/rpc
- Keystore: created fresh hybrid-falcon512 keys with quip_signer
  (public_from_seed(seed_bytes), account_id_from_public) at ~/.quip/keystore.json
- Faucet: curl POST https://faucet.aglais.quip.network/request
  -> {"amount":10000000000000, "extrinsic_hash":"0x87975a5eedfef11809b7245fe9838ac1c2a3d5299d383bee4c379c406bd61ac9"}
- WebSocket health check: wss://bootnode-1.aglais.quip.network:20049/rpc -> 40 peers, not syncing
- Local solve: SolverDWaveCPU().solve(model) — works instantly
- Network solve: SolverQuip.for_network("aglais", keystore="~/.quip/keystore.json",
  timeout=300).solve(model) — worked after increasing timeout

## Errors / retries

- DuckDuckGo + Google CAPTCHAs blocked search (used Bing + GitHub instead)
- docs code `from xqmx import XQMX` -> ModuleNotFoundError; correct: `from xqsa.solver import XQMX`
- `model.set_quadratic((0, 1, 2))` -> TypeError (missing j, value); correct: `set_quadratic(0, 1, 2000)`
- `XqmxModel` (xqffi.vm) lacks `.mode`; must use xqsa.solver.XQMX dataclass
- SolverQuip constructor appears to hang: needs generous timeout on creation
- First network solve: QuipTimeoutError (order 196) at 30s timeout — miners need longer
- First Max-Cut formulation used binary variables + negative couplings: wrong semantics
  (all-spins-same minimum). Switched to SPIN domain with positive couplings: correct Max-Cut.

## Final result

demo.py: Max-Cut on Petersen graph (10 nodes, 15 edges).
- Local: 12/15 cuts in 0.028s
- Network (Aglais testnet): 12/15 cuts in 93.4s, order_id 207,
  solver 5GEXqCpB1gty3EERx1rjymHuhwJCXpXnBRS9xY5uYmpq87EB,
  best_energy_milli -9000000, 16 miner submissions, energy_matches_chain True.
- Earlier successful order: 204 (4-node cycle, -4000000 milli, 8 submissions).
- Account: 0x5b78be36c4d8d7fbd11dfa28ab3ca33143efbfa2ae323bda1e62fe47b3795d5a
- Faucet tx: 0x87975a5eedfef11809b7245fe9838ac1c2a3d5299d383bee4c379c406bd61ac9
