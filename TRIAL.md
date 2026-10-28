# t04-a

- **Round:** Round 1
- **Model:** DeepSeek V4 Flash
- **Task:** 6-job, 3-machine scheduling QUBO, locally and on Aglais
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| 6-job, 3-machine scheduling QUBO, locally and on Aglais | DeepSeek V4 Flash | xqsa/xquad compute | Built and working on testnet (live compute jobs) | ~12 min | At the time, Submit a Job said testnet endpoints were unpublished and did not cover `topology="native"` (fixed on 2026-09-29) [C-CMP-01, C-TRL-17]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** DeepSeek V4 Flash.
- **What it does:** Formulates a 6-job/3-machine load-balancing problem as an 18-variable QUBO, solves it locally, then submits the same model as a real job to Quip's compute mempool on Aglais.
- **Quip products and integration:** `xqsa`/`xquad` `SolverQuip.for_network("aglais", topology="native", autofund=True)` — NATIVE.
- **Evidence:** Builder's report: five network jobs, orders 108, 109, 110, 112 and 113; the best, order 113, reached the brute-force optimum (energy −957, loads [9,9,9]); its `propose_job` extrinsic is [0xb1ea0bccdd0fb445d06e6130fc164fb00edc3926a9b6975757c907909e4ad29a](https://subscan.aglais.quip.network/sub/extrinsic/0xb1ea0bccdd0fb445d06e6130fc164fb00edc3926a9b6975757c907909e4ad29a) (block 374836). Rebuilds: one submitted its own order 130 (imbalance 2) and re-queried it in a fresh process; the other submitted order 126 (optimum) and re-read the builder's order 113. Our own re-run (2026-09-29) submitted order 171, which returned a feasible but not optimal answer (imbalance 4); results vary between runs because the miners are heuristic solvers.
- **Key Quip call** (`schedule_qubo.py:126-138`):
```python
elif mode == "quip":
    from xqsa import SolverQuip

    solver = SolverQuip.for_network(
        "aglais",
        topology="native",
        keystore="keys/keystore.json",
        autoconfirm=True,
        autofund=True,
    )
    q = solver.quote(model)
    print("[quip] quote:", q)
    result = solver.solve(model)
```
- **What got in the way:** At the time of the trial, Submit a Job said connection details for the public test network had not been published (fixed on 2026-09-29) [[C-CMP-01](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Connection%20details%20for%20the%20public%20test%20network%20have%20not%20been%20published%20yet)]. The compute pages also did not mention `topology="native"` then; the builder took it from the xquad book tutorial, expecting default placement to fail on this dense model [[C-TRL-17](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Arbitrary%20problem%20shapes%20are%20not%20yet%20supported)]. Submit a Job has covered native mode since 2026-09-29.

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
