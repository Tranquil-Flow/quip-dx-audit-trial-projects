# t08-b

- **Round:** Round 1
- **Model:** GPT-6
- **Task:** Raffle drawn with Quip QVRF (Node.js)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Raffle drawn with Quip QVRF (Node.js) | GPT-6 | none (used ANU's external random source) | Blocked: QVRF unusable; built on a non-Quip random source | ~10 min | [C-TRL-47]. Not rebuilt. |

_No full card exists for this trial; it is covered by the summary row above only._

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
