# v3-b

- **Round:** Round 3
- **Model:** GPT-5.6
- **Task:** Researcher (screenshot-only): max-cut on compute
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Researcher (screenshot-only): max-cut on compute | GPT-5.6 | xquad/xqsa, faucet, Subscan | Built and working on testnet | 32 min | Subscan block search and event headings [C-R5-22, C-R5-23, C-R4-22, C-TRL-22]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-5.6.
- **What it does:** A tested CLI with four unit tests that encodes Max-Cut on a 4-cycle as a QUBO, solves it exactly and with the local annealer, and with `--network` quotes and submits it to Aglais (placed topology by default, `--native` optional), writing the result and on-chain metadata to a JSON file. The builder's write-up was left as "IN PROGRESS" even though the network run had completed.
- **Quip products and integration:** `xquad` / `xqsa` `SolverQuip`, the Aglais faucet and Subscan — NATIVE.
- **Evidence:** Order 184: proposer matches, 5 solutions, result [1,0,1,0] with energy -4 and `energy_matches_chain` true. The `propose_job` extrinsic is [0x4ca4cdcd5aea2ccde010723635cbff2a2756097d79da35b4bcebd9dc12db274d](https://subscan.aglais.quip.network/sub/extrinsic/0x4ca4cdcd5aea2ccde010723635cbff2a2756097d79da35b4bcebd9dc12db274d) (389635-11), which we recomputed from the block. First rebuild: works with its own order 193. Second rebuild: works with its own order 235, reaching the same result; it noted that the write-up was stale (still "IN PROGRESS") although the logs show the builder's network run completed.
- **Time:** 32 min.
- **What got in the way:** Subscan's "Substrate Block" search by block hash returns no results for a valid block [[C-R5-22](https://subscan.aglais.quip.network/sub/block/0x743c871c085a86a2f91031955f64879747550c50c3d71d5828387366292fcf52)], and an event page is headed with the extrinsic index instead of the event id [[C-R5-23](https://subscan.aglais.quip.network/sub/event/389635-51)]. Subscan account search does not accept the SDK's hex account id [[C-NET-10](https://subscan.aglais.quip.network/account/0x0fB3366B98302D61Ee216B607576cC147A509e8B)]. A trivial QUBO triggers an unexplained allowed-value warning [[C-CMP-14](https://developers.quip.network/docs/compute/submit-a-job#:~:text=swap%20in%20the%20SolverQuip%20backend)]. Order status stays "Opened" after the result is final [[C-R4-22](https://developers.quip.network/docs/compute/submit-a-job#:~:text=The%20order%20closes%20at%20whichever%20comes%20first%2C%20the%20hard%20deadline%20or%20the%20end%20of%20that%20window)]. The result gives a block hash but no extrinsic hash or block number [[C-TRL-22](https://github.com/QuipNetwork/xquad/blob/5239d71bfbd025a91f06d872ad7e98da4b5e4556/xqsa/quip.py#L1140-L1156)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
