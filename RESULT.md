# RESULT: WORKING

## Summary
Submitted two small max-cut problems (16 and 20 nodes, random 3-regular graph) as Ising jobs to the public Quip testnet ("aglais") via the Python SDK (`xqsa.SolverQuip`), got solutions back, and compared with classical solvers on the laptop. Both testnet answers hit the exact optimum.

## How to run
```
uv venv --python 3.13 .venv && source .venv/bin/activate
uv pip install "xquad[quip]" networkx numpy
QUIP=1 python maxcut.py                    # N=16, default topology
N=20 NATIVE=1 QUIP=1 python maxcut.py      # N=20, topology="native"
```
Without `QUIP=1` only the classical baselines run. Keystore is created at ./keys/keystore.json (throwaway testnet key, auto-funded from the faucet; I passed an explicit keystore path so nothing went to ~/.quip).

## Evidence
| Instance | Exact max-cut (brute force) | SA (SolverDWaveCPU) | Quip aglais |
|---|---|---|---|
| N=16, 24 edges | 21 (0.9s) | 21, E=-18 (0.05s) | order_id 122, E=-18 (cut 21), 93.6s, 147 submissions, energy_matches_chain=True, miner 5EXYq2gZ8ApHupvXSE8TNRosSMx9jq6z83phSFvGb245ZSnj |
| N=20, 30 edges | 26 (8.1s) | 26, E=-22 (0.13s) | order_id 123, E=-22 (cut 26), 79.6s, 13 submissions, energy_matches_chain=True, miner 5E7fgcQm3WEdURyzGnxVZWGvHcQrhrasTKfKPUV7VpUD9Wgp |

- Network: wss://bootnode-1.aglais.quip.network:20049/rpc, faucet https://faucet.aglais.quip.network
- My account id (hex): 0xa77016a2c943311a283ffe61b0364c6287414530bdb51b265b12d740e951e47f
- status(122): Opened, is_final True, blocks 376609-376620; status(123): blocks 376638-376649.
- No tx hashes captured (SDK surfaces only order ids); I did not check the Subscan explorer.
- Caveat: at these sizes classical SA is ~1000x faster and equally good; the comparison shows correctness/latency, not advantage. Whether a real QPU (vs CPU/GPU miner) answered is not exposed (only miner account address).

## What didn't work
- Following the official docs alone: BLOCKED. submit-a-job says "Connection details for the public test network have not been published yet."; I only succeeded after finding `SolverQuip.for_network("aglais")` in the installed package's docstrings and https://aglais.quip.network.
- N=20 on the default topology: PlacementError (see FRICTION F8); worked with topology="native".
- quip.gitbook.io/docs (from search) is 404.

## Top 5 doc/site changes
1. On submit-a-job, replace "connection details have not been published" with `SolverQuip.for_network("aglais")`, RPC + faucet URLs, and link https://aglais.quip.network from the docs nav and homepage.
2. Document faucet/autofund and the consent gates (autoconfirm/autofund), plus the default keystore location ~/.quip/keystore.json.
3. Provide a complete copy-paste max-cut/QUBO example (spin vs binary model, QUBO->Ising conversion, decoding `result.sample`, expected ~1-2 minute runtime) instead of the 4-variable toy that prints an opaque XQMX object.
4. Explain topologies concretely: name the default topology and its size/degree, when placement fails, and `topology="native"` tradeoffs (QPU miners excluded).
5. Fix stale search-indexed URLs (quip.gitbook.io/docs 404 -> redirect) and document how to look up an order (order id, `status()`, `query(order_id, model)`, explorer link).
