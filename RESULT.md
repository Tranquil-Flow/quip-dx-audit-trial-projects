# RESULT

## Status: WORKING

The 18-variable scheduling QUBO was formulated, solved locally with Quip's
XQuad/XQSA tooling, submitted as a real job to the public Aglais Quip testnet,
and read back both by the original blocking `solve()` call and a separate
`query(order_id, model)` call.

No mainnet, real-value token, existing wallet, or public post was used. A new
throwaway hybrid keystore was created at `./keys/aglais-scheduling.json` with
mode 0600. Aglais AGLS is faucet-issued testnet currency which the network page
states has no value.

## Problem and optimum

Jobs in input order have durations `(3,5,2,7,4,6)`. The model minimizes

```
sum_m (sum_i d_i*x_i,m - 9)^2 + 100*sum_i(sum_m x_i,m - 1)^2.
```

See `FORMULATION.md` for the expanded QUBO coefficients and the exact
QUBO-to-Ising conversion. XQMX omits the additive constant 843, so the optimal
reported binary-model energy is -843; adding 843 recovers objective 0.

The optimum partitions the jobs into three duration-9 pairs:

- jobs 1 and 6: `3+6=9`
- jobs 2 and 5: `5+4=9`
- jobs 3 and 4: `2+7=9`

Machine labels are interchangeable. Exact enumeration of all `3^6=729` valid
assignments found minimum squared imbalance 0 and six labelled optima.

## Local result

Command:

```sh
.venv/bin/python schedule_qubo.py local --output local_result.json
```

Observed XQSA `SolverDWaveCPU` result (seed 20260928, 1,000 reads, 5,000
sweeps):

- machine jobs: `[[1,6], [3,4], [2,5]]`
- loads: `[9,9,9]`
- QUBO energy without constant: `-843`
- recovered penalized objective: `0`
- load range / squared imbalance: `0 / 0`
- valid exactly-one assignment: `true`
- solver timing: `0.602740625035949 s`

Full result: `local_result.json`
SHA-256: `ef9edac3e911833a91808d4f3127b466349c89029848efe7d8ae1bb603e032bf`

## Real Quip network result

Network: Aglais public Quip testnet

- Job/order identifier: **111**
- Submission extrinsic hash:
  `0x3b73ed6b8757a5f270a844e5fabcc9eac190b0fe2e90d814583ad5ae2bae886b`
- Inclusion block: `374812`
- Inclusion block hash:
  `0x11c81f6eb952b3a5e3680bdfbe14694e44515837e703cf51bf8087dffc2bb25f`
- Extrinsic index/call: `6 / QuantumComputeMempool.propose_job`
- New submitter SS58 address:
  `5G5NsthyBhwv2Ks4vgWDAmnE7aM2C8aZWWZsYH2UYjzGDoDf`
- Submitter AccountId:
  `0xb1744a60242126067a277e3067cffdb88110e2bd4c68b5ed60ae38dbc3092b22`
- Winning miner:
  `5DPhy7jpFj3ikUZgVpwkrXnjFLYXqsWWPNUCrEvmzq2AEwFJ`
- Miner submissions: `19`; winning solution vectors: `1`
- `best_energy_milli`: `-765000`; `energy_matches_chain`: `true`
- returned machine jobs: `[[3,4], [2,5], [1,6]]`
- returned loads: `[9,9,9]`
- XQSA QUBO energy: `-843`; recovered objective: `0`
- network solve wait/timing: `77.26605945895426 s`

The Ising chain energy and QUBO energy differ because the binary-to-spin basis
change has an additive offset. `energy_matches_chain=true` is XQSA's direct
check that the returned spins recompute to the chain's milli-scale Ising
energy.

Initial exact quote: reward `1,000,000,000,000` planck, fee
`1,905,750,333` planck, total `1,001,905,750,333` planck. The fresh account was
funded with one 10-AGLS faucet drip. These are valueless test tokens.

Evidence files:

- `network_result.json` — original `solve()` response; SHA-256
  `912da395fcec2fe91f1008e2eb3270f0d62b658408ba02da1bd7410b164498bb`
- `network_query_result.json` — independently recovered with `query(111, ...)`;
  SHA-256 `06e8d3e39a4c04b08108937ba7aff69d430bf6d0e42a3ec59d5f39ba4ca5fdc1`
- `network_run.log` — quote, faucet, proposal event, and result; SHA-256
  `171840d16368a8239f91734a1d1f9bb35fe7ebf610535dbe80abde083810284f`
- `network_chain_evidence.json` — decoded inclusion-block evidence

## How to run

```sh
uv venv --python 3.13 .venv
UV_CACHE_DIR=.uv-cache uv pip install 'xquad[quip]==0.4.1'

# Local
.venv/bin/python schedule_qubo.py local

# New real testnet job (creates a fresh key if the path does not exist)
.venv/bin/python schedule_qubo.py network \
  --keystore keys/aglais-scheduling.json \
  --output network_result.json

# Recover this completed job
.venv/bin/python schedule_qubo.py query 111 \
  --keystore keys/aglais-scheduling.json \
  --output network_query_result.json

# Exhaustive formulation checks
.venv/bin/python -m unittest -v test_schedule_qubo.py
```

Do not commit or share `keys/aglais-scheduling.json`.

## Verification performed

- Exhaustively checked all `2^18=262,144` bit strings: expanded QUBO energy plus
  constant 843 equals the original squared objective and constraint penalty.
- Enumerated every valid assignment and confirmed the optimum.
- Checked local, original-network, and later-query JSON all decode to valid
  `[9,9,9]` solutions with objective 0.
- Confirmed query result order id 111 and both chain-energy canaries are true.
- Decoded inclusion block 374812 directly through the Quip client to obtain the
  proposal extrinsic hash, signer, pallet call, and index.
- Confirmed the throwaway keystore mode is 0600.
- Unit tests: 2 passed in 11.847 s; Python byte-compilation passed.

## What did not work / caveats

- The older developer-portal compute page says public testnet connection details
  are not published. That is stale: the current Aglais page and XQuad 0.4.1
  package contain working public RPC/faucet coordinates.
- An early PyPI metadata curl failed because the host filesystem had only about
  373 MiB free and `/tmp` reported `No space left on device`. Using `uv` with a
  project-local cache succeeded.
- One combined verification command was rejected by the terminal safety parser
  because Python's bitwise `&` looked like shell backgrounding. Rewriting it
  with `stat.S_IMODE` fixed it; no process was started by the rejected command.
- The high-level solver result exposes order id and winning solver, but not the
  proposal extrinsic hash or inclusion block. I had to read XQSA source/logging
  and decode the inclusion block through its internal `_iface` client to record
  transaction-grade evidence.
- The network is explicitly beta/pre-release; endpoints, metadata, economics,
  and balances may reset. Re-running creates a different order id and output.

## What would make the vendor docs/tools easier

1. Update the public submit-job page to name Aglais, its RPC/faucet, and the
   tested `SolverQuip.for_network("aglais", topology="native")` path.
2. Link the excellent `quip-first-job.md` walkthrough from the public docs and
   publish it with the released package version.
3. Return `extrinsic_hash`, inclusion block number/hash, submitter address, and
   network name in `SolverResult.metadata`, rather than only logging the block.
4. Document why chain Ising milli-energy and returned QUBO energy differ, and
   expose the basis-change offset in metadata.
5. Provide a small official scheduling/load-balancing example, including a safe
   penalty-selection argument and result decoder.
