# RESULT — Scheduling QUBO on Quip Network

## Status: WORKING

Both deliverables completed: a local solve with Quip's own tooling (found the proven
optimum) and a real job submitted to the Quip testnet whose on-chain result was fetched
back and verified (also the proven optimum, on the third submission attempt after
reweighting the objective).

## Problem

Assign 6 jobs (durations 3, 5, 2, 7, 4, 6; total 27) to 3 machines, minimizing load
imbalance. Optimum is a perfect 9/9/9 split, e.g. {2+7}, {3+6}, {4+5}.

## Formulation (QUBO → Ising)

Binary variable x[j][m] = 1 iff job j runs on machine m (18 variables, index 3j+m).

    H = A · Σ_j (Σ_m x[j][m] − 1)²  +  W · Σ_m (Σ_j d_j·x[j][m] − 9)²

with A = 100 (assignment penalty, > max objective cross-term 2·7·6 = 84), W = 1 for the
plain model and W = 15 for the reweighted one submitted as order 116. Ideal load 9 =
27/3. All coefficients integer (the wire format is fixed-point thousandths). Expanded
into linear + quadratic terms on an `XQMX.binary_model(18)`; the toolchain converts the
binary model to the spin basis (x = (s+1)/2) for the chain.

Ground state verified by brute force over all 3⁶ = 729 feasible assignments:
- plain model (W=1): min energy −843, 6 optimal assignments, all with loads (9,9,9)
- reweighted (W=15): min energy −4245, same 6 optimal assignments

## Results

LOCAL (xqsa.SolverDWaveCPU, simulated annealing on CPU, num_reads=1000, num_sweeps=2000):
  energy          −843  (= brute-force ground state)
  assignment      [1, 2, 0, 0, 2, 1]  (job → machine)
  machine loads   M0 = 2+7, M1 = 3+6, M2 = 5+4 → [9, 9, 9]
  imbalance       Σ(L−9)² = 0  (perfect balance)
  runtime         0.2 s

NETWORK (Quip testnet "aglais", wss://bootnode-1.aglais.quip.network:20049/rpc):
  job identifier  order_id 116   (earlier attempts: 114, 115 — see below)
  winning solver  5DXr9LokuLE5bs2ZZyhDwbJfR9SqceL7kohQbgMebDcymhfD
  submissions     13 miner submissions competed
  chain energy    best_energy_milli = −3,075,000 (spin basis, fixed-point thousandths)
  model energy    −4245 (= brute-force ground state; energy_matches_chain: True)
  assignment      [1, 2, 0, 0, 2, 1]  (job → machine)
  machine loads   M0 = 2+7, M1 = 3+6, M2 = 5+4 → [9, 9, 9]
  imbalance       Σ(L−9)² = 0  (perfect balance)
  reward paid     1 AGLS (testnet, from the faucet) + 0.0019 AGLS fee
  wall clock      ~80 s submit → final

  Earlier network runs (same plain model, W=1):
  - order 114 (reward 1 AGLS, 7 submissions): feasible but sub-optimal — loads
    [11, 8, 8], imbalance 6, model energy −837.
  - order 115 (reward 5 AGLS, 12 submissions): same −837 result; a higher reward
    attracted more miners but did not improve quality.
  Scaling the imbalance term ×15 made the energy gap visible to the network's
  annealers and order 116 landed exactly on the optimum.

## How to run

    cd /private/tmp/devtrials2/t04-glm-5.2
    export UV_CACHE_DIR=$PWD/.uvcache
    uv venv --python 3.13 .venv          # pip venv may fail: machine disk ~full
    uv pip install --python .venv/bin/python "xqsa[quip]"
    export QUIP_KEYSTORE=$PWD/keys/testnet-throwaway.ks

    .venv/bin/python scheduling_qubo.py   # build QUBO + brute-force oracle
    .venv/bin/python solve_local.py       # local CPU solve (ground state)
    .venv/bin/python solve_network3.py    # network solve (order 116 pattern)
    .venv/bin/python solve_network.py     # network solve, plain weights (order 114)

solve_network*.py self-fund from the testnet faucet when the account is short
(autoconfirm=True, autofund=True); they poll until the order finalizes and print
order_id, energies, assignment and loads, and save network_result*.json.

Keystore: keys/testnet-throwaway.ks — a brand-new key generated for this task.
No mainnet, no real funds, testnet AGLS only.

## Evidence

- network_result.json (order 114), network_result2.json (order 115),
  network_result3.json (order 116) — captured solver metadata + decoded schedule
- network_run.log, network_run2.log, network_run3.log — full console output
- order ids 114/115/116 readable on-chain via `SolverQuip.query(order_id, model)`;
  re-queried 114, 115, 116 after settlement and got identical results
- account balance after all runs: 3.994282749001 AGLS (started 0, faucet-dripped 10;
  consistent with paying reward+fee on orders 114 and 115 — order 116's 1 AGLS reward
  appears not to have left the account the same way, exact payout accounting not traced)
- DEVLOG.md — every source, command, error and workaround

## What did not work / gotchas

1. quip.gitbook.io docs URLs all 404 — stale host still indexed by search engines and
   linked from the homepage. Live docs: developers.quip.network.
2. The "Submit your first compute job" page says testnet connection details "have not
   been published yet" — false; the endpoint ships as a preset inside xqsa
   (`SolverQuip.for_network("aglais")`). Found by reading package source, not docs.
3. Default placement path failed: PlacementError "search budget exhausted after 200000
   steps" — an 18-variable near-clique doesn't fit the registered advantage2 topology
   (4577 nodes, 41515 edges) and the greedy placer burns its budget. Worked around with
   `topology="native"` (submits the model's own coupling graph). This option is in the
   SolverQuip docstring but not on the docs page.
4. Registered topologies advertise allowed_h = {0}, allowed_j = {±1000 milli} (zero-field,
   ±1-coupling Ising). Real problems violate this. It's advisory only — the pallet does
   not enforce it and the SA miners solve as-is; the SDK emits a warning at most. This is
   documented only in a source comment.
5. `reward` is in planck (10¹² per AGLS), not AGLS. reward=5 → on-chain
   ExtrinsicFailed (module 9, error 0x0d, BelowMinReward). Nothing in the docs states
   the unit; found via the MinReward chain constant.
6. Quality floors (min_energy, min_solutions, min_diversity) are documented as a feature
   but hardcoded to None in SDK v1 (`_propose_call_params`: "advisory and unset in v1"),
   so you can't demand a target energy from Python.
7. `result.sample` is an XQMX object, not a dict — extract spins with
   `.iter_linear()`. Undocumented.
8. pip venv creation failed (machine disk 100% full, 2.2 GiB free); used uv with a
   project-local cache instead.

## What would have made this easier

- Publishing the testnet RPC endpoint on the compute docs page (it exists; the page
  even claims the opposite). Same for the `for_network("aglais")` preset.
- Documenting `topology="native"` next to the topology-subgraph requirement — for dense
  toy problems the default path just fails with a budget error.
- Stating the reward unit (planck, 12 decimals) and MinReward on the docs page.
- Documenting that allowed_h/allowed_j on registered topologies are advisory, and what
  coefficient ranges real hardware accepts.
- An exposed `min_energy_milli` parameter, since diversity/energy floors are the
  documented way to keep miners honest.
- SS58 address formatting helper on the signer (account_id is raw 32 bytes).
- Fresh gitbook links or a redirect from quip.gitbook.io to developers.quip.network.
