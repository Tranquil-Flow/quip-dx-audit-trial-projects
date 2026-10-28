# v3-c

- **Round:** Round 3
- **Model:** MiMo-V2.5, then DeepSeek V4 Pro for the last part
- **Task:** Researcher (screenshot-only): max-cut on compute
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Researcher (screenshot-only): max-cut on compute | MiMo-V2.5, then DeepSeek V4 Pro for the last part | xquad/xqsa, faucet | Built and working on testnet | 80 min | [C-TRL-17, C-TRL-22, C-CMP-17, C-R5-24]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** MiMo-V2.5 (117 model calls), then DeepSeek V4 Pro (24).
- **What it does:** Python scripts that encode a 6-node and a 12-node max-cut graph as an Ising model, solve it locally with the CPU annealer and brute force, then submit the same model as a paid Aglais compute job and compare cut size, energy and time, printing the order id and winning miner.
- **Quip products and integration:** `xquad` / `xqsa` (`SolverQuip`, `topology="native"`, faucet autofund) — NATIVE.
- **Evidence:** Orders 211 (Closed, 5 solutions), 206 and 208 all exist with the trial account as proposer and the claimed graph, miner and energy (-5,000,000 milli). The 12-node job has no order id in the write-up and could not be tied to one order. One claimed block hash is a sibling fork block, not the canonical one; the order itself is on the canonical chain. The agent reused a throwaway testnet key that an earlier trial had left in the home keystore instead of making a fresh one, and described it as freshly created (testnet only). First rebuild: works with its own order 225 (7/9 in about 170 s), using a project-local keystore. Second rebuild: works with its own orders 231 and 232; the builder's order 211 payout checks out, though one block hash the builder cited and one the rebuild printed were not canonical.
- **Time:** 80 min.
- **What got in the way:** Web search did not surface Quip [[C-AGT-03](https://quip.gitbook.io/docs)]. `result.sample` is an opaque object [[C-CMP-16](https://developers.quip.network/docs/compute/submit-a-job#:~:text=print%28result.sample%2C%20result.energy%29)]. Default placement fails on a 12-node graph and the error does not mention native topology [[C-TRL-17](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Arbitrary%20problem%20shapes%20are%20not%20yet%20supported)]. There is no way to view a compute job on an explorer and the result has no block or extrinsic, so the agent turned on debug logging to cite evidence [[C-TRL-22](https://github.com/QuipNetwork/xquad/blob/5239d71bfbd025a91f06d872ad7e98da4b5e4556/xqsa/quip.py#L1140-L1156)]. Manual faucet funding means copying an account id out of a keystore that holds the seed in plaintext [[C-CMP-17](https://developers.quip.network/docs/compute/submit-a-job#:~:text=created%20for%20you%20on%20first%20use%20if%20it%20does%20not%20exist)]. The docs give no block time or expected job duration [[C-R5-24](https://developers.quip.network/docs/compute/submit-a-job)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. `RESTORED.md` lists the files taken from the session log because the snapshot predates their last change. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
