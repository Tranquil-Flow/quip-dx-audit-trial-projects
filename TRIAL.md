# g5-a

- **Round:** Round 3
- **Model:** DeepSeek V4 Pro
- **Task:** QUBO locally and on testnet compute
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| QUBO locally and on testnet compute | DeepSeek V4 Pro | xquad/xqsa, faucet, quip-solver-core | Built and working on testnet | 12 min | Energy input units undocumented; the result has no extrinsic hash [C-R5-14, C-TRL-22, C-NET-10]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** DeepSeek V4 Pro.
- **What it does:** A Python project that encodes a 6-node weighted MaxCut as a binary QUBO, brute-forces the optimum, solves it locally with xquad's CPU annealer, then submits the same model as a paid job to Quip's Aglais compute mempool with `SolverQuip` (faucet autofund) and compares the answers, cross-checking the chain energy with `quip-solver-core`.
- **Quip products and integration:** `xquad` / `xqsa` `SolverDWaveCPU` and `SolverQuip`, Aglais faucet, `quip-solver-core` — NATIVE.
- **Evidence:** Order 177 on Aglais (36 submissions, final). Its `propose_job` extrinsic is [0xaac2b349df599fd58ea6199b25ca669453f2f0946b549e3393b5cab2eabb74d4](https://subscan.aglais.quip.network/sub/extrinsic/0xaac2b349df599fd58ea6199b25ca669453f2f0946b549e3393b5cab2eabb74d4) (block 389404), and the faucet extrinsic is [0x2390a6604b4b22a0b0d7a0212f1ea0449f8d3ccc2be13354448be1124fbb86c1](https://subscan.aglais.quip.network/sub/extrinsic/0x2390a6604b4b22a0b0d7a0212f1ea0449f8d3ccc2be13354448be1124fbb86c1) (block 389402). First rebuild: works, with its own order 190 (116 submissions) and propose_job [0x3d8a6c1fe1361ea358f5f7058717caab0c7d36bbe4ac4b2984bcbdb937559f8e](https://subscan.aglais.quip.network/sub/extrinsic/0x3d8a6c1fe1361ea358f5f7058717caab0c7d36bbe4ac4b2984bcbdb937559f8e). Second rebuild: works (order 210, same optimum); it noted the project's query script hard-codes the builder's order id, and that the winning solver's hardware class is visible in chain storage, contrary to the builder's claim. The builder said `quip-solver-core` 0.0.2rc3 was used, but the environment held 0.0.1.
- **Time:** 12 min.
- **What got in the way:** When this run read the Submit a Job page, at about 09:30 UTC on 2026-09-29, the page still said that connection details were unpublished [[C-CMP-01](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Connection%20details%20for%20the%20public%20test%20network%20have%20not%20been%20published%20yet)]. Quip's fix had been merged at 07:08 UTC, and runs that read the page from about 09:45 UTC saw the new version. The energy function's input units are not documented [[C-R5-14](https://pypi.org/project/quip-solver-core/0.0.1/)]. Subscan's page routes for extrinsics and accounts return 404 [[C-NET-10](https://subscan.aglais.quip.network/account/0x0fB3366B98302D61Ee216B607576cC147A509e8B)]. An unexplained allowed-value warning appeared [[C-CMP-14](https://developers.quip.network/docs/compute/submit-a-job#:~:text=swap%20in%20the%20SolverQuip%20backend)]. The topology shape and ranges are not published [[C-R4-06](https://developers.quip.network/docs/compute/ising-topologies#:~:text=The%20network%20publishes%20a%20single%20default%20topology%20today)]. The job result omits the extrinsic hash [[C-TRL-22](https://github.com/QuipNetwork/xquad/blob/5239d71bfbd025a91f06d872ad7e98da4b5e4556/xqsa/quip.py#L1140-L1156)], and the winning miner's hardware is not shown to the user [[C-R4-20](https://quip.network/#:~:text=Buy%20compute%20credits%20and%20run%20them%20on%20a%20quantum%20processor)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. `RESTORED.md` lists the files taken from the session log because the snapshot predates their last change. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
