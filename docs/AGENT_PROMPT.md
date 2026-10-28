# Prompt: repair one trial project with your own test accounts

Copy everything in the box into an AI coding agent (one agent per project). Replace `<ID>` with the trial id, for example `t06-b`.

```text
You are repairing one project from the Quip Network Developer Experience Audit so that it runs again with MY OWN throwaway test accounts.

Repo:   https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects
Branch: trial/<ID>      (the branch contains only that one project)

SET UP
- Clone the repo and work in a fresh copy of branch trial/<ID> (git worktree or a new clone). Do not touch other branches.
- The `main` branch has docs/RUNNING.md and docs/REDACTIONS.md. Read them first.

HARD RULES
1. Testnets only. Never use mainnet, real funds, or any account I did not create for this task.
2. Never reuse a key, seed or secret found in this repo. They are public. Generate fresh ones.
3. Keep your keys out of git (gitignored keys/ folder or environment variables). Never print or paste a private key, seed or mnemonic into logs, reports or chat. Print addresses only.
4. Fund accounts only from official testnet faucets or the funding route in Quip's current docs. Do not use paid services or work around rate limits. If funding is unavailable, stop and tell me.
5. Make the smallest changes that get the project running. Do not alter what the project is trying to demonstrate to make it "pass". Record every change.
6. Stop and report if the project needs real money, credentials you do not have, or more than 60 minutes of work.

STEPS
1. Read TRIAL.md (what the project is supposed to do and the evidence the original run left), RUNNING.md (auto-generated install and input notes), RESULT.md and DEVLOG.md (the builder's own notes).
2. Install dependencies using RUNNING.md section 1 and the builder's steps. Keep pinned versions; if a pinned version no longer exists, use the nearest one and record it.
3. Restore the inputs that were not published (RUNNING.md section 3 and EXCLUDED.md): create fresh test accounts in the file format the reading script expects (open the script; use the project's own key generator if it has one), then fund them.
4. Check current network details at https://developers.quip.network/llms.txt. The code or notes may hardcode RPC URLs, chain ids, faucet URLs or contract addresses that have since changed. Update them through configuration or environment variables where possible. Contract addresses and transaction hashes in the notes belong to the original run, so redeploy with your account instead of reusing them.
5. Run the project's main flow end to end. Compare the outcome with the Evidence section of TRIAL.md. Transaction hashes will differ; judge the behaviour.
6. If it fails, work out whether the cause is (a) a defect in the project, (b) something Quip changed since September 2026, or (c) your environment. Fix (a) and (c) minimally. For (b), record what changed with a link to the current docs or source.

DELIVERABLES (in the project folder; do not include secrets)
- FIXUP_REPORT.md: result (WORKS / WORKS WITH FIXES / PARTLY WORKS / BLOCKED), the exact commands that worked, every change you made and why, what differs from the original evidence, and any difference between Quip's current behaviour and the original run.
- RUNNING_VERIFIED.md: a clean, copy-pasteable recipe that worked from a fresh clone, with the accounts and funding steps described but no secrets.
- A git patch of your changes (git diff against the branch) and, if you were told to, push it to a new branch named trial/<ID>-fixed.
```

## Tips for whoever runs it

- Give the agent a testnet funding route up front (Aglais faucet; a Base Sepolia faucet) so it does not stall on step 3.
- Run agents one project at a time on a machine where mainnet wallets are not logged in.
- Each branch can be repaired independently, so you can parallelise across projects.
