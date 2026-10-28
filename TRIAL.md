# h4-a

- **Round:** Round 2
- **Model:** GPT-6
- **Task:** Hobbyist: node and miner on a Mac
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Hobbyist: node and miner on a Mac | GPT-6 | nodes.quip.network, quip-miner | Partly working: miner registered; validator never synced | ~18 min | Node setup path; intermittent timeouts and HTTP 429 from a public bootnode RPC [C-NOD-01, C-TRL-25]. Not rebuilt; checked from its logs and chain state. |

_No full card exists for this trial; it is covered by the summary row above only._

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
