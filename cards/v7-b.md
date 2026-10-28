# v7-b

- **Round:** Round 3
- **Model:** GPT-6
- **Task:** Hackathon (screenshot-only): anything in an hour
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Hackathon (screenshot-only): anything in an hour | GPT-6 | xquad/xqsa, faucet | Built and working on testnet | 29 min | [C-SDK-07, C-CMP-14, C-TRL-22, C-R5-24]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-6.
- **What it does:** A "hackathon project picker": `demo.py` encodes four candidate projects with rewards and pairwise conflict penalties as a binary quadratic model, solves it with the local CPU annealer or, with `--network`, as a paid compute job on Aglais, and scores the returned selection against an exhaustive search of all 16 choices.
- **Quip products and integration:** `xquad` / `xqsa` (`SolverQuip`), Aglais faucet autofund — NATIVE.
- **Evidence:** Order 195 (4 nodes, 3 edges, Closed, 6 solutions, winning best energy -4750 milli as claimed). The trial never printed its account address, so the proposer cannot be tied to its key directly; the model, timing and metadata match. The SDK returns no transaction hash. First rebuild: works with its own order 224. Second rebuild: works with its own order 236, and it confirmed the builder's order 195; a clean unpinned install now resolves the 0.4.2 packages, with the same behaviour.
- **Time:** 29 min.
- **What got in the way:** Web search did not surface Quip [[C-AGT-03](https://quip.gitbook.io/docs)]. The Quickstart has no runnable hello-world [[C-SDK-07](https://developers.quip.network/docs/getting-started/quickstart#:~:text=Right%20now%20there%27s%20not%20much%20to%20do%20other%20than%20mine%20blocks)]. A plain `npm install` resolves 2025 previous-generation builds [[C-SDK-10](https://www.npmjs.com/package/@quip.network/ethereum-sdk?activeTab=versions)]. The docs' example and a tiny 4-variable model trigger an allowed-value warning [[C-CMP-14](https://developers.quip.network/docs/compute/submit-a-job#:~:text=swap%20in%20the%20SolverQuip%20backend)]. `solve()` returns only an order id [[C-TRL-22](https://github.com/QuipNetwork/xquad/blob/5239d71bfbd025a91f06d872ad7e98da4b5e4556/xqsa/quip.py#L1140-L1156)] and prints nothing during a 1.5 to 3 minute wait [[C-R5-24](https://developers.quip.network/docs/compute/submit-a-job)]. `best_energy_milli` differs from `result.energy` [[C-OLD1-20](https://gitlab.com/quip.network/xquad/-/blob/5239d71bfbd025a91f06d872ad7e98da4b5e4556/docs/book/src/solving/quip-network.md#L302-L307)].
