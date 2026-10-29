# x2-a

- **Round:** Round 5
- **Model:** MiMo-V2.5
- **Task:** Compute from a Linux server: 6-job QUBO locally and as a network job
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Compute from a Linux server: 6-job QUBO locally and as a network job | MiMo-V2.5 | xquad/xqsa, Aglais compute network and faucet | Built and working on testnet: three live jobs; the third, with a longer window, returned the optimum | 73 min | XQuad pages have no `.md` mirror; no guidance on the competition window, and the default returned suboptimal answers [C-OS-02, C-OS-03, C-TRL-20, C-R4-22]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** MiMo-V2.5.
- **What it does:** On a Linux server, it encodes the 6-job, 3-machine balance problem as an 18-variable one-hot QUBO with a squared-load term (penalty 1000), solves it locally with `SolverDWaveCPU` (checked against a brute-force search of all 729 assignments), creates a throwaway Aglais keystore, funds it from the faucet and submits three native-topology jobs with `SolverQuip`. The third job, with a longer competition window, returned the optimum, loads [9, 9, 9]. A further script reproduces the chain's energy calculation.
- **Quip products and integration:** `xquad`/`xqsa`/`xqvm-py` — NATIVE; Aglais compute network — NATIVE; Aglais faucet — NATIVE; Aglais Subscan (for verification) — NATIVE.
- **Evidence:** `JobOrders` 248, 249 and 250 on Aglais all show the builder's proposer account, creation blocks 477933, 478001 and 478030, and 4, 6 and 115 solutions, as claimed; the blake2-256 of the extrinsics at those positions matches the claimed `propose_job` hashes. The faucet extrinsic [0x0d3c04005067026f9424ca1c1c9d70326266d19e6faf1f7111c4fd58f80e70c0](https://subscan.aglais.quip.network/sub/extrinsic/0x0d3c04005067026f9424ca1c1c9d70326266d19e6faf1f7111c4fd58f80e70c0) is at block 477924, index 1. Order 248 is now Closed; 249 and 250 are still Opened. The first two jobs, with the default window, returned suboptimal answers (imbalance 8 and 4); the third (`block_wait=60`) returned imbalance 0. The write-up says so plainly. First rebuild: works (a clean Mac environment from `pip install xquad[quip]==0.4.2`, which needed source builds; the local solve gave loads [9, 9, 9]; its own network job, order 261, returned imbalance 5 from 23 submissions, valid but suboptimal, and its energy matched the chain's). Second rebuild: works. A new short-window job (order 274) returned a valid but suboptimal schedule; a longer-window job (order 275) reached the optimum with a different, equally optimal assignment.
- **Time:** 73 min.
- **Key Quip call** (`submit_network.py:29-36`, excerpt):
```python
solver = SolverQuip.for_network(
    NETWORK,
    keystore=KEYSTORE,
    topology="native",   # model's own coupling graph; SA miners can solve it
    autoconfirm=lambda q: q.total_planck <= 2 * 10**12,  # accept up to 2 AGLS
    deadline_blocks=deadline_blocks,
    block_wait=block_wait,
)
```
- **What got in the way:** Submit a Job links the XQuad "Solving on Quip Network" and "Your first Quip job" pages, but their `.md` URLs return 404 and `llms.txt` lists neither, so an agent working from Markdown cannot read them [[C-OS-02](https://developers.quip.network/docs/xquad/solving/quip-first-job.md)]. The page describes the competition window but gives no advice on how the default window (`block_wait` 10, `deadline_blocks` 100) affects answer quality [[C-OS-03](https://developers.quip.network/docs/compute/submit-a-job#:~:text=a%20shorter%20competition%20window%20opens)]. The page mentions a "Choosing a Penalty Weight" section that is not reachable, so the builder derived its own weight [[C-TRL-20](https://developers.quip.network/docs/compute/submit-a-job)]. An order's on-chain status stays Opened after its deadline, and the client works out finality [[C-R4-22](https://developers.quip.network/docs/compute/submit-a-job#:~:text=The%20order%20closes%20at%20whichever%20comes%20first%2C%20the%20hard%20deadline%20or%20the%20end%20of%20that%20window)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, caches and keys (see `EXCLUDED.md`). It was first recovered from the copy an independent rebuild made of the finished project, with the rebuild's own files removed; it was then compared with the agent's own working folder, which was kept on the Linux server where the trial ran, and matches it file for file. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
