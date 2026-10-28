# t02-c

- **Round:** Round 1
- **Model:** MiMo-V2.5
- **Task:** Create, fund and withdraw from a Quip PQ account
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Create, fund and withdraw from a Quip PQ account | MiMo-V2.5 | ethereum-sdk (Quip Accounts) | Blocked: chose Base Sepolia and could not get gas there; no transaction ran | ~22 min | [C-ACC-01, C-ACC-03]. Nothing to rebuild. |

_No full card exists for this trial; it is covered by the summary row above only._

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
