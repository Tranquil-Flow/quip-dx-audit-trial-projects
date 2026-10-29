# RESULT.md

Status: WORKING

Solved a 6-job / 3-machine scheduling problem (durations 3,5,2,7,4,6;
minimize load imbalance) as a QUBO, first with Quip Network's local
tooling, then for real on their public testnet "aglais". The network's
best job returned the provable optimum, identical to the local solve.

## Problem & QUBO formulation

18 binary variables x[i,j] = 1 if job i runs on machine j:

    H = A * Σ_i (Σ_j x[i,j] − 1)²      # one-hot: every job exactly once
      + B * Σ_j (Σ_i d_i·x[i,j])²      # balance: squared machine loads
    A = 1000 (constraint), B = 1 (objective)

Total load 27 is fixed, so minimizing Σ L_j² ⇔ minimizing Σ (L_j−9)²
(variance) ⇔ max−min imbalance. The perfect split [9,9,9] exists
({7,2},{3,6},{5,4}) → optimum imbalance 0. A=1000 prices out every
one-hot violation (the balance term only spans 243..729 on valid
assignments). 18 linear + 63 quadratic integer coefficients; on chain
they travel as ×1000 milli-scale i32 (far below the 2,147,483 cap).

Ground truth by exhaustive search (3^6 = 729 assignments):
  loads [9,9,9], imbalance 0, QUBO energy −5757
  (chain-basis spin milli energy −6,408,000)

## How to run what was built

    # one-time setup (Python 3.13 venv + vendor SDK)
    curl -sL https://astral.sh/uv/install.sh | sh
    ~/.local/bin/uv venv --python 3.13 .venv
    ~/.local/bin/uv pip install --python .venv/bin/python "xquad[quip]"

    .venv/bin/python qubo_scheduling.py              # QUBO + local solve + brute force
    .venv/bin/python setup_account.py                # fresh testnet key in ./keys + faucet
    .venv/bin/python submit_network.py [out.json] [deadline_blocks] [block_wait]
    .venv/bin/python verify_network.py [result.json] # chain-basis energy cross-check
    .venv/bin/python query_order.py <order_id>       # on-chain status + result readback

## Results

### 1) Local solve (xqsa `SolverDWaveCPU`, CPU simulated annealing)

    .venv/bin/python qubo_scheduling.py
    job -> machine : [2, 0, 1, 1, 0, 2]
    machine loads  : [9, 9, 9]   imbalance max-min = 0
    QUBO energy    : -5757   one-hot valid: True
    local energy matches brute-force optimum: True

PROVABLY OPTIMAL (matches exhaustive enumeration).

### 2) Network solve (Quip Network testnet "aglais", `SolverQuip`)

Same model, same `solve()` call; only the backend class changes
(`SolverDWaveCPU` → `SolverQuip.for_network("aglais", keystore=...,
topology="native")`). topology="native" submits over the model's own
coupling graph (one-hot triangles don't fit as a subgraph of the
default annealer topology; the vendor's own tutorial does the same).

Throwaway testnet account (keys/keystore.json, mode 0600, never reused):
  address 0xd5f6c16b52d6f79b93a643b78dfc31fea327feb4475d95fa6cbdb28c7d3d691a
  (SS58 prefix 42: 5GuFMjcFhMcBuQt3KBmJUfWs4bjKacEJT6chSrvU8Xn5hw92)
  funded by faucet: 10 AGLS, extrinsic
  0x0d3c04005067026f9424ca1c1c9d70326266d19e6faf1f7111c4fd58f80e70c0
  (block 477924-1, Balances.transfer_keep_alive, success)

Quote per job (read from chain, fee_exact=True): reward 1.000000000000
AGLS + fee 0.001905750333 AGLS = 1.001905750333 AGLS. Final balance
after 3 jobs: 6.994282749001 AGLS = 10 − 3×1.001905750333 ✓.

JOB IDENTIFIERS AND RESULTS:

  order_id 248  (default window, 4 miner submissions, 95.3s)
    miner 5Eb82sAEyRToSgRK51njamL6xMT2gGriDKtXTMBfR31PSvwk
    assignment [2,1,1,2,2,0]  loads [6,7,14]  imbalance 8
    energy -5719  (chain best_energy_milli -6,370,000)
    propose_job extrinsic 0x65feb596a015920c82f5e7029b939f19c38d8c4c3f815976578db2a4c1e45e2c
    (block 477933-6) — valid, suboptimal (SA local optimum)

  order_id 249  (default window, 6 miner submissions, 91.6s)
    miner 5DVvgbz4LUpoNnQ4EPUg6yxcn7mpsJgp2HiPLTQGEPzU7mNS
    assignment [1,0,2,2,1,0]  loads [11,7,9]  imbalance 4
    energy -5749  (chain best_energy_milli -6,400,000)
    propose_job extrinsic 0x665f54998868dd835bec8be6593253c62e13f92a7242c677a27f5e85b129a2de
    (block 478001-11) — valid, still 8 above optimum

  order_id 250  (LONGER competition window: deadline_blocks=300,
    block_wait=60 → 115 miner submissions, 392.1s)  ← headline result
    miner 5DcfRBCJdTy57YzGX6LGeksK9RwDRoYgaj7nynaPp7Gtp9rN
    assignment [1,0,2,2,0,1]  loads [9,9,9]  imbalance 0
    energy -5757  (chain best_energy_milli -6,408,000)
    propose_job extrinsic 0x036a1d2f4ad6a1ff1c7386745d1262df0d5b6a4c565be9914c3431c6d90f2059
    (block 478030-7) — MATCHES THE LOCAL OPTIMUM EXACTLY

Every returned sample was independently re-verified two ways:
  - local recompute of QUBO energy from the returned bits equals
    result.energy (−5719 / −5749 / −5757);
  - `verify_network.py` reproduces the chain's exact coefficient
    pipeline (dimod BINARY→SPIN, offset discarded, milli scale) and
    gets exactly each order's on-chain best_energy_milli
    (energy_matches_chain canary reproduced by hand).
On-chain readback (`query_order.py`): order 250 final at block height
with solution_count 115; `query(250, model, topology="native")`
re-decoded the identical optimal sample from chain storage.

## What did not work, and why

- web_extract tool: its backend refused every URL ("search-only backend").
  Worked around with curl. Minor, but cost a few minutes.
- The docs' deep pages under /docs/xquad/solving/*.md 404 (only the
  mdBook .html renders exist); the "Choosing a Penalty Weight" page
  referenced from the solver reference is not reachable at any guessed
  URL. Worked around by reading the .html and the installed package
  source (xqsa/quip.py, quip_codec.py, quip_faucet.py, quip_signing.py).
- System Python is 3.12; xquad needs 3.13+. Worked around with uv.
- The first two network jobs did NOT return the optimum: the fleet's
  simulated annealing converged to local optima (imbalance 8, then 4)
  under the default 10-block competition window with only 4–6 miner
  submissions. The vendor documents this as unmeasured ("Timing and
  fleet behaviour are unmeasured… one run, not a distribution").
  Fix applied: re-submit with a longer competition window
  (block_wait=60 vs 10) → 115 submissions → the fleet returned the
  global optimum. Practical lesson: on this network, competition
  parameters matter as much as the encoding.
- Subscan explorer API rejects the hex account address ("Invalid
  Account Address"); it wants SS58 prefix 42. Derived via
  substrateinterface ss58_encode(); documented in DEVLOG.md.

## What in the vendor's docs/tools would have made this easier

- A scheduling (or generic QUBO) worked example: the docs only walk a
  TSP; a partition/balance example would have shown the penalty-weight
  tradeoff directly.
- The penalty-weight guidance page is referenced from the solver
  reference but not reachable on the site.
- No guidance on choosing deadline_blocks/block_wait — yet these
  materially changed the answer quality (4 subs → imbalance 8 vs
  115 subs → imbalance 0). A note like "more competition ≈ better
  answers; default window is short" would have saved two jobs.
- The default keystore path ~/.quip/keystore.json is a footgun for
  anyone who must keep keys project-local; the keystore= argument
  exists and works, but the default is not called out as a caveat.
- result.metadata.best_energy_milli being in the SPIN basis (with the
  binary-model offset discarded) is documented, but there is no helper
  to convert it back to the binary-basis energy of result.energy;
  I had to reimplement the pipeline (verify_network.py) to confirm the
  chain had verified the model I thought I submitted.

## Files

- qubo_scheduling.py     QUBO model + local solve + brute-force check
- setup_account.py       fresh testnet keystore in ./keys + faucet
- submit_network.py      quote + submit to aglais + decode + verify
- query_order.py         on-chain status/query readback by order id
- verify_network.py      chain-basis energy cross-check per job result
- network_result{,_2,_3}.json   machine-readable job outputs
- docs_src/              vendor docs consulted (md mirrors + mdBook text)
- DEVLOG.md              full log: sources, commands, errors, deviations
- keys/keystore.json     throwaway testnet key (0600; contents never printed)
