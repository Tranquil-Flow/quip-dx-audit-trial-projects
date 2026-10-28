# t04-b

- **Round:** Round 1
- **Model:** GLM-5.2
- **Task:** 6-job, 3-machine scheduling QUBO, locally and on Aglais
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| 6-job, 3-machine scheduling QUBO, locally and on Aglais | GLM-5.2 | xqsa/xquad compute | Built and working on testnet | ~25 min | The reward unit (planck) was not stated at the time, so a reward of `5` was rejected as `RewardTooLow` [C-TRL-19, C-CMP-01, C-TRL-17]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GLM-5.2.
- **What it does:** The same scheduling QUBO, reweighted after an early network run landed on a merely-feasible (not optimal) solution.
- **Quip products and integration:** `xqsa`/`xquad` `SolverQuip.for_network("aglais", ...)` — NATIVE.
- **Evidence:** Builder's report: order 116 on Aglais, after orders 114 and 115 with the plain model; model energy −4245 (the brute-force optimum of the reweighted model), assignment [1,2,0,0,2,1], loads [9,9,9]. Rebuilds: one submitted its own order 132 and re-read it via `.status()`/`.query()` in a fresh process, with the same energy and assignment; the other submitted orders 131 (plain model) and 142 (reweighted). Our own re-run (2026-09-29) submitted order 172 and again got energy −4245.
- **Key Quip call** (`solve_network3.py:65-75`):
```python
solver = SolverQuip.for_network(
    "aglais",
    keystore="keys/testnet-throwaway.ks",
    faucet="https://faucet.aglais.quip.network",
    topology="native",
    reward=1_000_000_000_000,  # 1 AGLS
    autoconfirm=True,
    autofund=True,
    timeout=900.0,
    poll_interval=6.0,
)
```
- **What got in the way:** Its first job used the default 1 AGLS reward; on a retry the builder passed `reward=5` meaning 5 AGLS, but the reward is in planck, so the chain rejected the job with module 9 error 0x0d, `RewardTooLow` (the builder's log calls it BelowMinReward). At the time of the trial Submit a Job gave no unit or minimum, though the xquad book did; Submit a Job has stated both since 2026-09-29 [[C-TRL-19](https://developers.quip.network/docs/compute/submit-a-job#:~:text=if%20you%20do%20not%2C%20the%20solver%20uses%20the%20chain's%20configured%20minimum)]. At the time of the trial the page also said testnet connection details were unpublished [[C-CMP-01](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Connection%20details%20for%20the%20public%20test%20network%20have%20not%20been%20published%20yet)], and the builder hit `PlacementError` before finding `topology="native"` in the SolverQuip source [[C-TRL-17](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Arbitrary%20problem%20shapes%20are%20not%20yet%20supported)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
