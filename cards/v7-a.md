# v7-a

- **Round:** Round 3
- **Model:** Claude Sonnet 5.5
- **Task:** Hackathon (screenshot-only): anything in an hour
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Hackathon (screenshot-only): anything in an hour | Claude Sonnet 5.5 | xquad/xqsa, faucet | Built and working on testnet | 11 min | The Quickstart hides the compute path, and `solve()` is silent while it waits [C-SDK-07, C-CMP-16, C-R5-24]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** Claude Sonnet 5.5.
- **What it does:** `demo.py` builds a max-cut QUBO for a 5-node ring-with-chord graph, solves it locally with the CPU annealer, and with `net` submits it as a paid job to Aglais via `SolverQuip`, printing the miner's assignment, cut size and job metadata.
- **Quip products and integration:** `xquad` / `xqsa` (`SolverQuip`), Aglais faucet autofund — NATIVE.
- **Evidence:** Order 183 (5 nodes, 6 edges, Closed, 8 solutions, best energy -2000 milli as claimed), plus a 2-node probe, order 182. The SDK returns no transaction hash, as the builder said. First rebuild: works with its own order 191 (cut 5, about 100 s). Second rebuild: works, with its own order 209; it noted the unpinned install has no lockfile.
- **Time:** 11 min.
- **What got in the way:** Web search did not surface Quip [[C-AGT-03](https://quip.gitbook.io/docs)]. The nav "Docs" link opens a new tab with no signal, so the click looks dead [[C-R5-26](https://quip.network/)]. The Quickstart says there is not much to do except mine blocks and hides the compute path [[C-SDK-07](https://developers.quip.network/docs/getting-started/quickstart#:~:text=Right%20now%20there%27s%20not%20much%20to%20do%20other%20than%20mine%20blocks)]. `result.sample` is opaque [[C-CMP-16](https://developers.quip.network/docs/compute/submit-a-job#:~:text=print%28result.sample%2C%20result.energy%29)]. The docs' own example triggers an allowed-value warning [[C-CMP-14](https://developers.quip.network/docs/compute/submit-a-job#:~:text=swap%20in%20the%20SolverQuip%20backend)]. `best_energy_milli` differs from `result.energy` with no explanation [[C-OLD1-20](https://gitlab.com/quip.network/xquad/-/blob/5239d71bfbd025a91f06d872ad7e98da4b5e4556/docs/book/src/solving/quip-network.md#L302-L307)]. The keystore is created without a password [[C-CMP-17](https://developers.quip.network/docs/compute/submit-a-job#:~:text=created%20for%20you%20on%20first%20use%20if%20it%20does%20not%20exist)]. There is no wall-clock expectation for a network solve (about 80 to 100 s) and `solve()` is silent while waiting [[C-R5-24](https://developers.quip.network/docs/compute/submit-a-job)].
