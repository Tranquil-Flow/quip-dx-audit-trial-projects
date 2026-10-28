# t05-a

- **Round:** Round 1
- **Model:** Claude Sonnet 5
- **Task:** Run an Aglais validator and CPU miner via Docker on macOS
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Run an Aglais validator and CPU miner via Docker on macOS | Claude Sonnet 5 | nodes.quip.network, quip-miner | Built and working on testnet: own validator synced, miner registered | ~38 min | The official compose setup failed on Docker Desktop: PGID crash loop, dashboard `chown`, keystore path, fixed ports. README step 1 is stale [C-T05-01, C-T05-02, C-T05-03, C-T05-04, C-NOD-01]. Not rebuilt; its public-chain evidence was checked. |

_No full card exists for this trial; it is covered by the summary row above only._

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
