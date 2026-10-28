# RESULT — Quip Network: local QUBO solve vs testnet compute job

## Overall status: WORKING

| Component | Status | Evidence |
|---|---|---|
| Install vendor solver packages | WORKING | `pip install "xquad[quip]"` (xquad/xqsa 0.4.1) + `quip-solver-core` 0.0.2rc3 in .venv (Python 3.13.14) |
| Solve QUBO locally | WORKING | SolverDWaveCPU found energy -36 (provably optimal) on all 4 seeds; work/local_result.json |
| Submit to Quip testnet (aglais) | WORKING | order_id 177, propose_job tx 0xaac2b349…74d4, block 389404-5, success |
| Network solved it (miner competition) | WORKING | winner sample [0,1,0,0,1,1], energy -36 = optimum; 36 submissions, 1 distinct solution |
| Compare results | WORKING | identical optimum; chain energy independently re-verified with quip-solver-core's consensus scorer |
| On-chain recovery / audit | WORKING | query() in a fresh process re-reads order 177; Subscan API confirms both extrinsics |

## The problem

MaxCut on a fixed weighted graph on 6 nodes (9 edges, weights 2–8, all even),
encoded as a binary QUBO: L_i = -(incident weight sum), Q_ij = +2 w_ij.
min E = -(max cut weight). Brute force (2^6 = 64 states): optimum energy **-36**
(max cut weight 36), 4 optimal assignments.

## Results compared

    local  (SolverDWaveCPU, dwave-samplers SA, seeds 1,2,3,42, 100 reads x 1000 sweeps):
            sample [1,0,1,1,0,0]   energy -36   (optimal, ~4 ms)
    network (SolverQuip, aglais testnet, chain DefaultTopology placement):
            sample [0,1,0,0,1,1]   energy -36   (optimal, ~82 s wall, of which
            ~79 s solver-side poll; a miner answered one block after proposal)

Both hit the same provably-optimal energy; the returned assignments are two of
the four symmetric optima. xqsa recomputes energy locally from the returned
spins in exact integer arithmetic (never trusts the backend): both matched.
Chain-reported best_energy_milli = -15000; independently recomputed with
quip-solver-core's consensus primitive `scoring.energy_milli(spins, h, j, edges)`
= -15000, exactly matching. (E_spin = -15 = E_bin - const, const = -21.)

## Testnet evidence (all on aglais testnet, no real value)

- Account (brand-new, throwaway, keystore kept in ./keys/keystore.json, mode 0600):
  SS58: 5GdSb2MzWqHHfT7ixQEXeVzDQcSPqARxK32nYGYbmGdeAt7r
  hex:  0xc9e8a13122f84d4863ad63dfa7afa50d3d5e7a2e00d97096b161799e52f44410
- Faucet drip (10 AGLS): faucet-reported extrinsic
  0x2390a6604b4b22a0b0d7a0212f1ea0449f8d3ccc2be13354448be1124fbb86c1
  (Subscan: Balances.transfer_keep_alive, block 389402-1, from faucet account
  5CyTXAkbWe9yMKorLpXeTt6M4hsmohErzp2NUfaNodFVco6G)
- Job proposal: extrinsic 0xaac2b349df599fd58ea6199b25ca669453f2f0946b549e3393b5cab2eabb74d4
  (Subscan: QuantumComputeMempool.propose_job, block 389404-5, success=True).
  On-chain IsingParams: nodes [96,108,120,2496,2520,2532], h all 0,
  j [2000,1000,3000,3000,2000,3000,4000,2000,1000] milli (w/2 each — matches
  the spin-basis fold of the submitted QUBO exactly). reward 1e12 planck = 1 AGLS,
  mode Open, SingleBest, deadline 100 blocks, block_wait 10.
- Order: order_id = 177. created_at block 389404, first_solution_at 389405,
  effective_expiry 389415, 36 solution submissions, 1 distinct solution after
  diversity collapse. Winning miner account: 5EXYq2gZ8ApHupvXSE8TNRosSMx9jq6z83phSFvGb245ZSnj.
- Cost: reward 1.0 AGLS + fee 0.001898261115 AGLS (exact quote) = 1.001898261115 AGLS.
  Final balance 8.998101738885 AGLS = 10 - 1.001898261115 (verified on-chain).
- Verifying on the explorer: subscan.aglais.quip.network serves a custom Next.js
  SPA whose UI routes 404 via curl; use its JSON API instead:
    POST https://subscan.aglais.quip.network/api/scan/extrinsics
         {"address":"5GdSb2MzWqHHfT7ixQEXeVzDQcSPqARxK32nYGYbmGdeAt7r","row":10,"page":0}
    POST https://subscan.aglais.quip.network/api/scan/extrinsic
         {"hash":"0xaac2b349df599fd58ea6199b25ca669453f2f0946b549e3393b5cab2eabb74d4"}
  (Both return code 0 with the records quoted above.)

## How to run what I built

Setup (Python 3.13 required):

    python3.13 -m venv .venv
    .venv/bin/pip install "xquad[quip]" quip-solver-core

Local solve + ground truth:

    .venv/bin/python work/qubo.py          # model + brute-force optimum (-36)
    .venv/bin/python work/solve_local.py   # SolverDWaveCPU, 4 seeds -> work/local_result.json

Network submission (needs internet; creates ./keys/keystore.json on first run,
auto-funds one 10-AGLS faucet drip when the fresh account is short, proposes,
waits for a miner, saves everything):

    .venv/bin/python work/submit_network.py  # -> work/network_result.json

Comparison incl. independent consensus-scorer cross-check:

    .venv/bin/python work/compare.py

Recover the order from chain state in a new process (offline-proof of the result):

    .venv/bin/python work/query_order.py    # order_id 177 hardcoded

Note: ./keys/keystore.json is the account for the job above. A rerun reuses it
(balance already holds ~8.998 AGLS, so no new drip). To start over, delete the
keystore and generate a fresh throwaway account.

## What did NOT work / caveats

- The official "Submit your first compute job" docs page is stale: it claims
  testnet connection details are unpublished. The live coordinates are in
  xqsa.quip_networks ("aglais" preset) and https://aglais.quip.network.
- A UserWarning fired at submission: 7 of my coefficients fall outside the
  registered topology's allowed-value set. Per the vendor's spec this is
  accepted as-is (real hardware rescales coefficients monotonically; the
  optimum is preserved) and the job solved fine — but a stricter deployment
  could reject such models, so coefficient ranges should be chosen from the
  topology's allowed values.
- quip-solver-core's `energy_milli` unit convention is undocumented in the
  README: it takes NATURAL-scale coefficients and returns milli-scale energy.
  Passing milli-scaled coefficients silently returns a value 1000x too large
  (it will not error). Determined by experiment against the chain's value.
- Subscan-lookalike explorer UI deep links 404 via curl (custom SPA); JSON API
  works and was used for verification.
- The docs' TSP walkthrough used topology="native"; for this 6-node graph the
  DEFAULT chain topology placement succeeded, so native was not needed. Dense
  graphs may still require native mode.
- No real quantum hardware was necessarily involved: aglais is an open market,
  so the winning miner could be a CPU/GPU simulated-annealing miner (the
  result does not identify the hardware class). The chain verified the answer;
  QPU-specific claims would need a hardware-restricted job mode.

## What would have made this easier (vendor docs/tools wishlist)

1. Keep the submit-a-job docs page in sync with the live testnet (RPC/faucet
   endpoints, or at least a pointer to aglais.quip.network).
2. Document energy_milli's input/output units explicitly.
3. Return the propose_job extrinsic hash in SolverResult.metadata (I had to
   reach into the private `_prepare()` to capture it).
4. Publish the registered topology's node/coupling shape and allowed-value
   ranges so modelers can pick compliant coefficients up front.
5. Expose the winner's hardware class (CPU/GPU/QPU) in job metadata so
   "compare against the network" can state what actually solved it.
