# RESULT — Job scheduling on Quip Network (QUBO/Ising)

Status: **WORKING**

Problem: assign 6 jobs (durations 3, 5, 2, 7, 4, 6; total 27) to 3 machines,
minimising load imbalance (ideal = 9 per machine). Solved both locally with Quip's
toolchain and by submitting real jobs to the Quip Network testnet.

## What was built

    /private/tmp/devtrials2/t04-deepseek-v4-flash
      schedule_qubo.py     QUBO builder + brute-force optimum + local solve + network solve
      penalty_sweep.py     local experiment that chose the penalty strength
      submit_many.py       submits N jobs to the network, records every result to quip_attempts.json
      DEVLOG.md            full source/command/error log
      RESULT.md            this file
      keys/keystore.json   throwaway testnet key (created on first use; nothing pre-existing reused)
      quip_run.log, quip_run2.log, quip_run_many.log, quip_attempts.json   raw outputs

## The formulation

Variables x[i][m] ∈ {0,1} — job i (i=0..5, durations d = [3,5,2,7,4,6]) runs on
machine m (m=0,1,2). 18 binary variables.

    E(x) = Σ_m ( Σ_i d_i · x[i][m] )²          ← squared machine loads (balance surrogate)
         + P · Σ_i ( Σ_m x[i][m] − 1 )²        ← each job on exactly one machine

Minimising the sum of squared loads balances the machines: total load is fixed, so the
squared sum is smallest exactly when loads are equal (ideal 27/3 = 9).

Expanded to the linear + quadratic coefficients the toolchain takes:

    linear[i,m]                      = d_i² − P
    quadratic[(i,m),(j,m)]  (i<j)    = 2·d_i·d_j     (jobs sharing a machine)
    quadratic[(i,m),(i,m')] (m<m')   = 2·P           (same job, two machines)

Model: XQMX(mode=MODEL, domain=BINARY, size=18, linear_terms=18, quadratic_terms=63).

**Penalty choice matters a lot (found empirically, not stated in the docs).** P=1000
makes the optimum a shallow local minimum behind a large barrier — a single job moves
only by momentarily violating the one-hot constraint, and the barrier (~P) swamps the
objective gain. P ≤ 100 lets the annealer drop feasibility. P = 200 is the sweet spot:
locally 20/20 valid *and* 20/20 optimal, and it still enforces the constraint strictly
(minimum infeasible energy 209+P = 409 > 243 = the true optimum).

Ground truth: full brute force over 3⁶ = 729 assignments gives min Σloads² = 243 at
loads [9,9,9] (jobs {3,2}, {5,4}, {6,3} on the three machines). QUBO global minimum = −957.

## Result 1 — local (Quip toolchain, no network)

`SolverDWaveCPU(seed=42)` (CPU simulated annealing, base `xquad` install):

    energy = -957
    machines (durations) = [[2,7], [5,4], [3,6]]
    loads = [9, 9, 9]   imbalance = 0        ← optimal, matches brute force

## Result 2 — real job on the Quip Network

Submitted with `SolverQuip.for_network("aglais", topology="native", keystore="keys/keystore.json")`
to the Aglais public testnet (`wss://bootnode-1.aglais.quip.network:20049/rpc`).
Five real jobs were submitted (the miner fleet is a heuristic; it does not always return
the optimum, so a few attempts were needed):

| order_id | job (planck/milli) | energy | loads    | imbalance | miner |
|---------:|--------------------|-------:|----------|----------:|-------|
| 108      | P=1000 formulation | −5733  | [13,7,7] | 6 | 5DXr9LokuLE5bs2ZZyhDwbJfR9SqceL7kohQbgMebDcymhfD |
| 109      | P=200              | −949   | [9,7,11] | 4 | 5F8JSnuLkeqo8tYj1NVAmpJ2aCh6qdd8VVBCB8D4yGKUshWu |
| 110      | P=200              | −955   | [8,10,9] | 2 | 5F8JSnuLkeqo8tYj1NVAmpJ2aCh6qdd8VVBCB8D4yGKUshWu |
| 112      | P=200              | −955   | [10,9,8] | 2 | 5DXeTU5xcTuukNfgDLZsZn8Xxr1qpsfTxdYTjfzbYtDsu541 |
| **113**  | P=200              | **−957** | **[9,9,9]** | **0** | 5DegFptD8BCv4m8ZgeS2WiuemVYLFf5w6qtcpfooYhywdHHT |

**Job identifier (best result): order_id 113** — energy −957, loads [9,9,9], imbalance 0.
This equals the brute-force optimum. `energy_matches_chain = True` (the local integer
recompute equals the chain's own `best_energy_milli` = −1608000), so the encoding and
decoding line up. Independently re-read after the fact with `solver.query(113, model,
topology="native")` → same energy −957, same miner, 36 submissions, 1 solution.

## Evidence

Account (fresh throwaway key in ./keys, created by the toolchain on first use):
    5Hg6xqRSVw6F33Zuu39ccz2SvVReN36c8rE5GQ3C1tLVjF7S
    account_id_hex 0xf82c8a0bf59b4c340412a4fb0f18b614de0c9d2fb1304255079c40eedfd458ae
    scheme hybrid-falcon512 (sr25519 + FN-DSA-512)
Balance after the 5 jobs: 4.990471248335 AGLS (faucet drip 10 AGLS − 5 × 1.001905750333).
No real money: AGLS is the Aglais testnet token, explicitly valueless and resettable.

On-chain `QuantumComputeMempool.propose_job` extrinsic hashes (from the block each order
was created in; retrieved via the substrate RPC):

    order 108  block 374769  0x6a6af0d6edc36a29d1b63d133a79dbaa30514830434a3f10bfa37c075343fcb7
    order 109  block 374792  0x7ca4707cb5d2e5510917486fbcfecc0d52c7e3b23d5774f280dd96ba221294ac
    order 110  block 374808  0x98d0950b0c0b34de0d21e819d3013b725bc799fc827bb48db2ed2b4f7f3dd1a6
    order 112  block 374822  0x071cd026d5818e5e064b348fc5718e2e1428f8398eed77e22814d08199665dc6
    order 113  block 374836  0xb1ea0bccdd0fb445d06e6130fc164fb00edc3926a9b6975757c907909e4ad29a
              block hash    0x7ce4bb41e01f2d7005c57f689b89a9cb20035c9f52a82ab4f70c48d45ae621c0

On-chain order lifecycle (via `solver.status`): order 113 created_at 374836, first
solution 374837, effective_expiry 374847, is_final=True, solution_count 36.
Explorer: https://subscan.aglais.quip.network  (order ids 108–113).

## How to run what was built

    cd /private/tmp/devtrials2/t04-deepseek-v4-flash
    /opt/homebrew/bin/python3.13 -m venv .venv
    .venv/bin/pip install "xquad[quip]"
    .venv/bin/python schedule_qubo.py local      # brute force + local SA solve (no network)
    .venv/bin/python penalty_sweep.py            # why P=200
    .venv/bin/python schedule_qubo.py quip       # one real job on the Aglais testnet
    .venv/bin/python submit_many.py 4            # several jobs, records quip_attempts.json

Network runs need the faucet drip the solver draws automatically (`autofund=True`) the
first time; the key in ./keys holds the balance afterwards.

## What did not work / caveats

- **The vendor docs are stale on the most important point.** The "Submit your first
  compute job" page says "Connection details for the public test network have not been
  published yet, so this page cannot include a node address." In fact the endpoint is
  published on agls.quip.network and hard-coded in `xqsa/quip_networks.py`. I only found
  it by reading source and the testnet homepage. Cost ~10 minutes of searching.
- **First real job (order 108) returned a valid but suboptimal schedule** (imbalance 6),
  not the optimum. The cause was my penalty choice, not the network: P=1000 gave a rugged
  landscape. Confirmed by a local sweep before resubmitting. The network then needed four
  more jobs (109/110/112/113) to hit the optimum — the miner fleet is a heuristic with its
  own randomness, so a single submission is not guaranteed optimal.
- **Quality floors are not reachable from the Python API.** The docs describe setting a
  minimum-energy threshold / diversity floor on a job, but `_propose_call_params` hard-codes
  `min_energy_milli = min_diversity_milli = min_solutions = None` ("advisory and unset in
  v1"). So I could not force miners to beat a threshold, only resubmit and take the best.
- The hysenlabs.com XQuad page returned an empty body (blocked); not needed.
- `topology="native"` was required: the default placement mode searches for the model's
  coupling graph as a subgraph of a registered hardware topology and raises `PlacementError`
  for dense arbitrary graphs (the official tutorial's own 16-variable TSP hits this). Native
  mode places the model on its own graph (identity), at the cost of excluding QPU-backed
  miners that cannot embed arbitrary graphs. The SA miner fleet answered every job.
- One job's worth of context: `xquad[quip]` installed from prebuilt macOS arm64 wheels, so
  the docs' warning about building `xqffi`/`quip-signer` from source with a Rust toolchain
  did not bite (Rust was present anyway).

## What in the vendor's docs/tools would have made this easier

1. **Publish the testnet RPC + faucet on the compute docs page**, not only the testnet
   homepage and the source. The compute job page actively says no endpoint exists yet.
2. **Expose the quality floors** (`min_energy_milli`, `min_diversity_milli`, `min_solutions`)
   as `solve()`/constructor parameters. The pallet already carries them; the client
   hard-codes them to None. A caller could then demand an energy threshold and avoid
   paying for suboptimal answers.
3. **Document the penalty/coefficient guidance.** Nothing warns that a large one-hot
   penalty makes the model badly conditioned for the network's annealers. A note on
   "keep penalties close to the scale of the objective" would have saved a wasted job.
4. **A `topology="native"` note on the compute page.** The subgraph-embedding requirement
   is explained, but the practical escape hatch (native mode) is only in the book, and the
   compute page does not mention that most small custom models will fail default placement.
5. **Report the reward/fee split and the winning miner more prominently** in the result
   object — they are present in `metadata` but not in the quickstart.
