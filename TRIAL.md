# m3-c

- **Round:** Round 2
- **Model:** DeepSeek V4 Pro
- **Task:** Portfolio QUBO on Quip compute, with the result recorded in a contract on Aglais
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Portfolio QUBO on Quip compute, with the result recorded in a contract on Aglais | DeepSeek V4 Pro | xqsa compute; Aglais EVM (its own registry contract) | Built and working on testnet | ~14 min | The dense model failed default placement and needed `topology="native"` [C-TRL-17]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** DeepSeek V4 Pro (all 57 model calls).
- **What it does:** Builds an 8-asset "pick 4" portfolio QUBO, tries the default compute-network topology, falls back to `topology="native"` when placement fails, and submits it as a real job to Quip's compute mempool on Aglais. A second script records the job id, selection bitmask, energy and winning miner into a self-deployed `PortfolioProof` contract; a third reads it back over public JSON-RPC and cross-checks every field against the solver output.
- **Quip products and integration:** `xqsa`/`xquad` `SolverQuip.for_network("aglais", ...)` — NATIVE (live); `PortfolioProof.sol` registry contract — CHAIN_ONLY (plain solc, not a Quip product). Both independent rebuilds agree.
- **Evidence:** compute order 167 on Aglais Substrate (11 miner submissions, winner matching the returned metadata); contract [0xA71E173DE6eEee18Cb33cEf4d7542f6F510e5591](https://explorer.aglais.quip.network/address/0xA71E173DE6eEee18Cb33cEf4d7542f6F510e5591), deploy tx [0xf6d5c7dcfcfc557c55e8326b61cc42bbb131c194e7d1b5f4505c2aa33d7997ce](https://explorer.aglais.quip.network/tx/0xf6d5c7dcfcfc557c55e8326b61cc42bbb131c194e7d1b5f4505c2aa33d7997ce), record tx [0x9e60d4b7127da0510f0b81b4c429a628bb5f2c6963fe2a2f03eba34e4f45d549](https://explorer.aglais.quip.network/tx/0x9e60d4b7127da0510f0b81b4c429a628bb5f2c6963fe2a2f03eba34e4f45d549). Rebuilds: one (order 169) and the other (order 168) each deployed and recorded a fresh copy. Our own re-run on 2026-09-29 (order 170) also worked; its network answer was feasible but not optimal.
- **Time:** 14 min.
- **Key Quip call** (`solve_portfolio.py:96-113`, excerpt):
```python
try:
    # Default topology = the network's (D-Wave-scale) hardware graph.
    # A dense K8 coupling graph needs an 8-clique; annealer topologies
    # (max degree 20) do not contain one, so placement is expected to fail.
    solver = SolverQuip.for_network("aglais", keystore=KEYSTORE)
    result = solver.solve(model)
    topo_notes = {"mode": "default-topology", "placed": True}
except PlacementError as e:
    ...
    solver = SolverQuip.for_network("aglais", keystore=KEYSTORE, topology="native")
    result = solver.solve(model)
```
- **What got in the way:** The default topology can't place a dense 8-clique QUBO, and the PlacementError ("search budget exhausted") does not say why. For this dense model the fix was `topology="native"`; the other m3 builders reshaped the QUBO to fit instead. The builder's write-up says the xquad book's tutorial uses the same fix, but Submit a Job did not mention native mode at the snapshot [[C-TRL-17](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Arbitrary%20problem%20shapes%20are%20not%20yet%20supported)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
