# v3-a

- **Round:** Round 3
- **Model:** Claude Sonnet 5.5
- **Task:** Researcher (screenshot-only): max-cut on compute
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Researcher (screenshot-only): max-cut on compute | Claude Sonnet 5.5 | xquad/xqsa, faucet | Built and working on testnet | 8 min | Default placement failed on a small graph, and the error does not mention native mode [C-TRL-17, C-CMP-16, C-TRL-22]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** Claude Sonnet 5.5.
- **What it does:** A 34-line script that builds an 8-node random graph (18 edges), encodes max-cut as a QUBO, solves it by brute force and with the local CPU annealer, and with `net` also submits it to the Aglais compute marketplace in native topology mode and prints the returned cut next to the classical ones.
- **Quip products and integration:** `xquad` / `xqsa` `SolverQuip` and the Aglais faucet (autofund) — NATIVE.
- **Evidence:** Order 181 on Aglais: proposer matches the trial account, 8 solutions, status Closed, sample and energy -14 as claimed (cut 14, matching brute force). First rebuild: works with its own order 192 (energy -14). The rebuild also reproduced the builder's report that the default placed topology fails with a placement error on this small graph. The write-up gives no transaction hash, because the SDK prints none. Second rebuild: works with its own order 229 (same 14-edge optimum, about 82 s on the network); it funded the new account from the faucet explicitly before running.
- **Time:** 8 min.
- **What got in the way:** Default placement failed for a small 8-node graph and the error does not mention `topology="native"` [[C-TRL-17](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Arbitrary%20problem%20shapes%20are%20not%20yet%20supported)]. `result.sample` is an opaque object and the docs do not show how to read the assignment [[C-CMP-16](https://developers.quip.network/docs/compute/submit-a-job#:~:text=print%28result.sample%2C%20result.energy%29)]. `solve()` prints no order id or transaction hash [[C-TRL-22](https://github.com/QuipNetwork/xquad/blob/5239d71bfbd025a91f06d872ad7e98da4b5e4556/xqsa/quip.py#L1140-L1156)]. The keystore is created without a password and a pre-existing home keystore would be reused silently [[C-CMP-17](https://developers.quip.network/docs/compute/submit-a-job#:~:text=created%20for%20you%20on%20first%20use%20if%20it%20does%20not%20exist)]. The network solver was simulated annealing and nothing says which hardware solved the job [[C-R4-20](https://quip.network/#:~:text=Buy%20compute%20credits%20and%20run%20them%20on%20a%20quantum%20processor)]. Web search never surfaced Quip [[C-AGT-03](https://quip.gitbook.io/docs)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
