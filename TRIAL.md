# t04-c

- **Round:** Round 1
- **Model:** GPT-5.6
- **Task:** 6-job, 3-machine scheduling QUBO, locally and on Aglais
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| 6-job, 3-machine scheduling QUBO, locally and on Aglais | GPT-5.6 | xqsa/xquad compute | Built and working on testnet | ~11 min | [C-CMP-01, C-TRL-17]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-5.6.
- **What it does:** The same 18-variable scheduling QUBO, solved locally and then as a real network job.
- **Quip products and integration:** `xqsa`/`xquad` `SolverQuip(url=AGLAIS_RPC, faucet=AGLAIS_FAUCET, topology="native")` — NATIVE.
- **Evidence:** Builder's report: order 111 on Aglais, `propose_job` extrinsic [0x3b73ed6b8757a5f270a844e5fabcc9eac190b0fe2e90d814583ad5ae2bae886b](https://subscan.aglais.quip.network/sub/extrinsic/0x3b73ed6b8757a5f270a844e5fabcc9eac190b0fe2e90d814583ad5ae2bae886b) (block 374812), optimal loads [9,9,9]. Rebuilds: one submitted order 137 and got the same optimum; the other submitted order 143, which returned an invalid solution (one job unassigned), and confirmed its inclusion via raw `chain_getBlock`. Our own re-run (2026-09-29) submitted order 174, which returned a feasible but not optimal answer.
- **Key Quip call** (`schedule_qubo.py:130-135`):
```python
def run_network(output: Path, keystore: Path) -> int:
    model = build_model()
    solver = make_network_solver(keystore)
    quote = solver.quote(model, topology="native")
    print(str(quote), flush=True)
    result = solver.solve(model, topology="native")
```
- **What got in the way:** At the time of the trial, Submit a Job said testnet connection details were unpublished and did not mention `topology="native"`; the builder used the xquad book tutorial and the Aglais site instead [[C-CMP-01](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Connection%20details%20for%20the%20public%20test%20network%20have%20not%20been%20published%20yet), [C-TRL-17](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Arbitrary%20problem%20shapes%20are%20not%20yet%20supported)]. Both points were fixed on 2026-09-29.

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
