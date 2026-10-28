# DEVLOG — Quip Network QUBO job-scheduling trial

Project dir: /private/tmp/devtrials2/t04-deepseek-v4-flash
Host: macOS 26.5.1 (Apple Silicon), Python 3.13.14 (/opt/homebrew/bin/python3.13), Rust/cargo present.
Goal: 6 jobs (durations 3,5,2,7,4,6) -> 3 machines, minimise load imbalance. Formulate as
QUBO/Ising, solve (a) locally with Quip's tooling, (b) by submitting a real job to their network.

------------------------------------------------------------
SOURCES CONSULTED (in order)
------------------------------------------------------------
1. web_search: "Quip Network compute offering QUBO Ising solver"
2. web_search: "Quip Network quip.network quantum blockchain docs"
3. https://developers.quip.network/docs/compute/submit-a-job        <- primary how-to
4. https://developers.quip.network/docs/getting-started/quickstart
5. https://github.com/QuipNetwork
6. https://hysenlabs.com/en/projects/quipnetwork-xquad   (FETCH FAILED, empty body)
7. https://developers.quip.network/docs/xquad-toolchain
8. https://developers.quip.network/docs/nodes/run-a-node-testnet
9. https://pypi.org/project/xquad/                        (versions, py>=3.13, extras)
10. https://github.com/QuipNetwork/xquad                  (package map, macOS build-from-source note)
11. GitHub org repo list (via #5): quip-miner, xquad, quip-validator, quip-miner-cpu, nodes.quip.network
12. web_search: "Quip Network QUIP_RPC_URL testnet wss endpoint SolverQuip"
13. web_search: "developers.quip.network docs miners testnet node RPC address"
14. https://agls.quip.network/                            <- TESTNET HOMEPAGE: public RPCs + faucet + chain IDs
15. https://github.com/QuipNetwork/nodes.quip.network     (deployment/ports, topology spec)
16. https://github.com/QuipNetwork/xquad/blob/main/xqsa/README.md
17. https://raw.githubusercontent.com/QuipNetwork/xquad/main/spec/xqsa/SPEC.md   (thin, points to book)
18. https://raw.githubusercontent.com/QuipNetwork/xquad/main/docs/book/src/solving/README.md
19. https://raw.githubusercontent.com/QuipNetwork/xquad/main/docs/book/src/solving/quip-network.md  <- THE key doc
20. https://raw.githubusercontent.com/QuipNetwork/xquad/main/docs/book/src/solving/quip-first-job.md <- worked end-to-end run
21. https://api.github.com/repos/QuipNetwork/xquad/contents/xqsa/xqsa  -> 404 (wrong path, guessed)
22. git clone --depth 1 https://github.com/QuipNetwork/xquad /tmp/xquad_src  (read source, not just docs)
    - /tmp/xquad_src/xqsa/quip_networks.py   (aglais + devnet presets, RPC/faucet)
    - /tmp/xquad_src/xqsa/quip.py            (SolverQuip ctor, solve/quote/query/status, exceptions)

Key facts extracted:
- Tooling: `pip install "xquad[quip]"`  (needs Python >= 3.13). Local CPU SA solver = SolverDWaveCPU
  (base install, no network). Network backend = SolverQuip.
- Testnet = "Aglais" (chain `quip-testnet`, token AGLS, valueless, resettable). NO mainnet exists yet.
- Public substrate RPC: wss://bootnode-{1,2,3}.aglais.quip.network:20049/rpc
- Faucet: https://faucet.aglais.quip.network  (10 AGLS/drip, rate-limited; refuses browser calls).
- aglais preset in xqsa.quip_networks: rpc=wss://bootnode-1.aglais.quip.network:20049/rpc,
  faucet=https://faucet.aglais.quip.network
- SolverQuip.for_network("aglais", topology="native") is the documented path for arbitrary graphs.
- DEFAULT mode checks that the model's coupling graph is a subgraph of a registered on-chain
  topology; small/arbitrary graphs often fail with PlacementError. `topology="native"` skips
  placement (identity mapping) — that is what the official tutorial uses. Using it.
- Job cost reference (2026-09-24, specVersion 117): reward 1 AGLS (MinReward runtime constant) +
  fee ~0.0022 AGLS. AGLS is free from the faucet.
- metadata of a quip result: order_id, solver, best_energy_milli, energy_matches_chain,
  num_submissions, num_solutions.
- Caller must use a fresh keystore; default would be ~/.quip/keystore.json. We pass
  keystore=./keys/keystore.json to comply with the "keys go in ./keys" rule.

------------------------------------------------------------
COMMANDS THAT MATTERED
------------------------------------------------------------
- sw_vers; python3 --version; which python3.13 -> 3.13.14 present; cargo/rustc present (needed because
  xqffi/quip-signer build from source on macOS).
- /opt/homebrew/bin/python3.13 -m venv .venv
- .venv/bin/pip install "xquad[quip]"     -> SUCCESS, fast (prebuilt wheels for xqffi 0.4.1 and
  quip-signer 0.3.0 were available for macOS arm64 CPython 3.13; the docs' warning that macOS builds
  from source did NOT bite us — wheels existed).
  Installed: xquad 0.4.1, xqsa 0.4.1, xqcp 0.4.1, xqffi 0.4.1, xqvm-py 0.4.1, substrate-interface 1.8.1,
  quip-signer 0.3.0, dimod 0.12.22, dwave-samplers 1.8.0, ...
- git clone --depth 1 https://github.com/QuipNetwork/xquad /tmp/xquad_src   (to read source)

------------------------------------------------------------
FORMULATION (my own; not from vendor docs)
------------------------------------------------------------
Vars x[i][m] in {0,1}: job i (i=0..5, dur d=[3,5,2,7,4,6]) on machine m (0..2). 18 vars.
Total load = 27. Perfect balance = 9 each.
Objective (minimise sum of squared machine loads -> classic imbalance surrogate; equal loads minimise it):
  E_obj = sum_m (sum_i d_i x_im)^2
Constraint: each job on exactly one machine -> penalty
  E_pen = P * sum_i (sum_m x_im - 1)^2
QUBO = E_obj + E_pen, expanded to linear + quadratic:
  linear[i,m]    = d_i^2 - P
  quadratic same machine (i<j): 2 d_i d_j
  quadratic same job (m<m'):    2 P
P chosen large enough that no constraint violation can pay for itself. Max objective ~27^2=729,
so P=1000 puts each violation (>=P) far above any achievable objective gain. Coefficients stay
small (max |coef| = 2000) — far under the pallet's milli-scale i32 ceiling (~2.1e6 natural).

------------------------------------------------------------
DEVIATIONS / GUESSES / DEAD ENDS
------------------------------------------------------------
- docs Q&A said "Connection details for the public test network have not been published yet" — this
  is STALE. The endpoint IS published on agls.quip.network and baked into xqsa.quip_networks.py.
  I stopped trusting the doc page's note and read the source + testnet homepage instead.
- hysenlabs.com/xquad page returned empty content (blocked/JS). Did not need it.
- GitHub contents API path guess .../contents/xqsa/xqsa -> 404. Fixed by cloning the repo.
- Choosing topology="native": default placement would likely raise PlacementError for a dense
  scheduling QUBO (the tutorial's 16-var TSP hit exactly this). Native mode is documented and
  allows arbitrary graphs, but narrows the miner set (QPU miners can't answer native orders; the
  SA miner fleet can). Accepted this trade-off.
- I did NOT read every doc page: relied on submit-a-job + quip-network.md + quip-first-job.md +
  source. If job submission misbehaves I'll revisit the full book.

------------------------------------------------------------
PHASE 2 — LOCAL SOLVE
------------------------------------------------------------
- Wrote schedule_qubo.py (build_model + brute force + local solve).
- .venv/bin/python schedule_qubo.py local
  -> brute force optimum: sum-of-squares 243, loads [9,9,9], imbalance 0.
  -> SolverDWaveCPU(seed=42): energy -5757, loads [9,9,9], imbalance 0. MATCHES.

------------------------------------------------------------
PHASE 3 — FIRST NETWORK JOB (order 108)  [suboptimal -> led to a fix]
------------------------------------------------------------
- Quick connectivity/quote test (no submission) succeeded:
    quote: reward 1 AGLS, fee 0.001905750333 AGLS, total 1.001905750333 AGLS, balance 0.
    keystore created at keys/keystore.json (fresh key; nothing pre-existing reused).
- Submitted with topology="native", autoconfirm=True, autofund=True (draws a 10 AGLS drip).
  Result: order_id 108, energy -5733, ENERGY_MATCHES_CHAIN=True, but loads [13,7,7],
  imbalance 6 — a VALID schedule, but NOT the optimum (optimum is -5757 / [9,9,9]).
- Debugged: with P=1000 the one-hot penalty is 1.4x the whole objective range, so moving a
  job from one machine to another requires passing through an infeasible state costing ~P.
  The barrier dwarfs the objective gain -> annealer parks in a local minimum.

------------------------------------------------------------
PHASE 4 — PENALTY SWEEP (local)  -> P=200
------------------------------------------------------------
- penalty_sweep.py, 20 seeds each, SolverDWaveCPU(num_reads=100):
    P=  20  valid 0/20   optimal 0/20        (feasibility sacrificed)
    P=  50  valid 0/20   optimal 0/20
    P= 100  valid 0/20   optimal 0/20
    P= 200  valid 20/20  optimal 20/20   <-- chosen
    P= 400  valid 20/20  optimal 17/20
    P=1000  valid 20/20  optimal 14/20
- Sanity: brute-forced the FULL QUBO at P=200 -> global min -957 at loads [9,9,9]; the
  min infeasible energy is 209+200=409 > 243, so P=200 still enforces feasibility strictly.
- Set PENALTY=200 in schedule_qubo.py and re-ran locally: energy -957, loads [9,9,9]. Good.

------------------------------------------------------------
PHASE 5 — MORE NETWORK JOBS
------------------------------------------------------------
- order 109 (P=200): energy -949, loads [9,7,11], imbalance 4. Valid, suboptimal.
  (Balance was already 8.998 AGLS, so no faucet drip needed on later jobs.)
- submit_many.py 4  (records each attempt to quip_attempts.json):
    order 110: energy -955, loads [8,10,9],  imbalance 2, miner 5F8JSnu...  19 submissions
    order 112: energy -955, loads [10,9,8],  imbalance 2, miner 5DXeTU5...   6 submissions
    order 113: energy -957, loads [9,9,9],   imbalance 0, miner 5DegFptD... 36 submissions  <-- OPTIMUM
  Script stopped early on hitting the optimum. So the network DID reach the global optimum,
  but only after 5 jobs total — the miner fleet is a heuristic, not an exact solver.

------------------------------------------------------------
PHASE 6 — EVIDENCE COLLECTION
------------------------------------------------------------
- SS58 account: 5Hg6xqRSVw6F33Zuu39ccz2SvVReN36c8rE5GQ3C1tLVjF7S
  (account_id_hex 0xf82c8a0bf59b4c340412a4fb0f18b614de0c9d2fb1304255079c40eedfd458ae,
   scheme hybrid-falcon512). Balance after 5 jobs: 4.990471248335 AGLS.
- status(108/109/113) -> created_at / first_solution_at / effective_expiry / is_final.
- Read the block each order was proposed in over the substrate RPC and pulled the
  QuantumComputeMempool.propose_job extrinsic hash:
    108 -> block 374769, 0x6a6af0d6edc36a29d1b63d133a79dbaa30514830434a3f10bfa37c075343fcb7
    109 -> block 374792, 0x7ca4707cb5d2e5510917486fbcfecc0d52c7e3b23d5774f280dd96ba221294ac
    110 -> block 374808, 0x98d0950b0c0b34de0d21e819d3013b725bc799fc827bb48db2ed2b4f7f3dd1a6
    112 -> block 374822, 0x071cd026d5818e5e064b348fc5718e2e1428f8398eed77e22814d08199665dc6
    113 -> block 374836, 0xb1ea0bccdd0fb445d06e6130fc164fb00edc3926a9b6975757c907909e4ad29a
- Independent re-read: query(113, model, topology="native") -> energy -957, same miner.
- Subscan REST at /api/scan/extrinsic/list returned 404 (endpoint path unknown/unauthorised);
  got the extrinsic hashes straight from the RPC blocks instead. Dead end, worked around.

RESULTS
  local  : energy -957, loads [9,9,9], imbalance 0 (optimal)
  network: order_id 113, energy -957, loads [9,9,9], imbalance 0 (optimal)
  see RESULT.md for the full table and the vendor-docs wish list.
