# v7-c

- **Round:** Round 3
- **Model:** MiMo-V2.5, then DeepSeek V4 Pro for the last part
- **Task:** Hackathon (screenshot-only): anything in an hour
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Hackathon (screenshot-only): anything in an hour | MiMo-V2.5, then DeepSeek V4 Pro for the last part | xquad/xqsa, faucet | Built and working on testnet | 71 min | [C-SDK-07, C-SDK-10, C-CMP-14, C-R5-24]. The winning solutions were all from CPU solvers, so no quantum hardware run is shown. Independently rebuilt and confirmed. |

## Trial card

- **Model:** MiMo-V2.5 (127 model calls), then DeepSeek V4 Pro (20).
- **What it does:** `demo.py` encodes Max-Cut on the 10-node, 15-edge Petersen graph as an Ising model, solves it locally with the CPU annealer, submits it as a paid Aglais compute job via `SolverQuip`, and prints both partitions, cut counts, timings and job metadata (order id, winning solver, `energy_matches_chain`).
- **Quip products and integration:** `xquad` / `xqsa` (`SolverQuip`) and the Aglais faucet — NATIVE.
- **Evidence:** Order 207 (10 nodes, Closed, 16 solutions, best -9000000 milli, 12 of 15 edges cut, the Petersen max-cut), plus orders 204 and 196 (196 timed out client-side but its solutions arrived later). Faucet extrinsic [0x87975a5eedfef11809b7245fe9838ac1c2a3d5299d383bee4c379c406bd61ac9](https://subscan.aglais.quip.network/sub/extrinsic/0x87975a5eedfef11809b7245fe9838ac1c2a3d5299d383bee4c379c406bd61ac9) (block 391237). Overclaim: the builder's notes say the Submit a Job tutorial prints `from xqmx import XQMX` and a tuple argument to `set_quadratic`; the agent's own screenshot and the live page show the correct `xqvm_py` import and `set_quadratic(0, 1, 2)`, so this was a misreading. The agent also overwrote the shared keystore left in the home folder (testnet only). First rebuild: works with its own order 226 (12/15 in 150 s), using a project-local keystore. Second rebuild: works with its own order 234; it noted that the winning submissions for the builder's orders and its own were all `solver_type=Cpu`, so no quantum hardware execution is shown.
- **Time:** 71 min.
- **What got in the way:** Web search did not surface Quip [[C-AGT-03](https://quip.gitbook.io/docs)]. The nav "Docs" link opens a new tab with no signal [[C-R5-26](https://quip.network/)]. The Quickstart has no code and buries the compute path [[C-SDK-07](https://developers.quip.network/docs/getting-started/quickstart#:~:text=Right%20now%20there%27s%20not%20much%20to%20do%20other%20than%20mine%20blocks)], and npm `latest` resolves to outdated builds [[C-SDK-10](https://www.npmjs.com/package/@quip.network/ethereum-sdk?activeTab=versions)]. The network example triggers an allowed-value warning [[C-CMP-14](https://developers.quip.network/docs/compute/submit-a-job#:~:text=swap%20in%20the%20SolverQuip%20backend)]. `SolverQuip.for_network` takes about 15 s with no output, and the docs never say how long a job takes [[C-R5-24](https://developers.quip.network/docs/compute/submit-a-job)].

## Round 4

Round 4 ran on 1 October 2026 with eight of the round-3 screenshot-only briefs. Explorer links below use Base Sepolia on Blockscout, Aglais EVM transactions on the Aglais Blockscout, and Etherscan for read-only Ethereum mainnet contracts.
