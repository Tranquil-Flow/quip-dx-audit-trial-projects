# t05-b

- **Round:** Round 1
- **Model:** MiniMax-M3
- **Task:** Run an Aglais validator and CPU miner via Docker on macOS
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Run an Aglais validator and CPU miner via Docker on macOS | MiniMax-M3 | quip-miner | Partly working: miner only, pointed at a validator already running on the same machine | ~5 min | Avoided a port-30333 clash and asked for a documented miner-only recipe [C-T05-04, C-TRL-25]. Not rebuilt; its public-chain evidence was checked. |

_No full card exists for this trial; it is covered by the summary row above only._

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
