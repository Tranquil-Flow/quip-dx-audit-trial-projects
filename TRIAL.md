# h3-b

- **Round:** Round 2
- **Model:** MiMo-V2.5
- **Task:** Researcher: max-cut on Quip compute against classical solvers
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Researcher: max-cut on Quip compute against classical solvers | MiMo-V2.5 | xqsa compute | Built and working on testnet (optimum) | ~28 min | [C-CMP-01]. Rebuilds differ: one confirmed; the other found that an alternative script crashes and a printed solution count is wrong. |

## Trial card

- **Model:** MiMo-V2.5.
- **What it does:** Solves max-cut on a fixed 6-node bipartite graph three ways — brute force, local simulated annealing, and a job on the Aglais compute mempool.
- **Quip products and integration:** `xqsa` `SolverQuip.for_network("aglais", seed=..., autofund=True)` — NATIVE.
- **Evidence:** the builder's compute orders 129, 136 and 141 on Aglais, each with energy `-8` (optimum) and `energy_matches_chain=True`, autofunded from the faucet. Two independent rebuilds: one rebuild's order 158 reproduced the result. The other also got an optimal network result (order 156) but rated the project partly working: the advertised `maxcut_quip.py` alternative crashes, and the printed count of 4 optimal solutions is wrong (the true count is 2).
- **Time:** 28 min.
- **Key Quip call** (`comparison.py:135-145`, excerpt):
```python
solver = SolverQuip.for_network(
    "aglais",
    seed=seed_hex,
    timeout=120,
    autofund=True,
)
...
net_result = solver.solve(model)
```
- **What got in the way:** At the time of the trial, Submit a Job said connection details for the public testnet had not been published [[C-CMP-01](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Connection%20details%20for%20the%20public%20test%20network%20have%20not%20been%20published%20yet)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
