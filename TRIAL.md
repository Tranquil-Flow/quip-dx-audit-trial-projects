# h5-a

- **Round:** Round 2
- **Model:** Claude Opus 5.5
- **Task:** Wallet PM: one-page evaluation memo with facts checked live
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Wallet PM: one-page evaluation memo with facts checked live | Claude Opus 5.5 | SHRINCS keygen, one live compute job, one Aglais EVM transfer | Built and working: memo with facts checked live | ~24 min | Stale GitBook links; "no swap SDK" sentence; no deployments table [C-AGT-01, C-SWP-03, C-ACC-01]. One rebuild; confirmed. |

_No full card exists for this trial; it is covered by the summary row above only._

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
