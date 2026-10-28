# m4-a

- **Round:** Round 2
- **Model:** Claude Sonnet 5
- **Task:** Raffle using QVRF, or a documented substitute
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Raffle using QVRF, or a documented substitute | Claude Sonnet 5 | Aglais EVM; QVRF unreachable | Partly working: the raffle ran end to end on Aglais with a commit-reveal plus block-hash substitute; QVRF unusable | ~42 min | [C-TRL-47]. One rebuild; confirmed. |

_No full card exists for this trial; it is covered by the summary row above only._

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
