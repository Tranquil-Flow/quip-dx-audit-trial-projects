# h6-a

- **Round:** Round 2
- **Model:** GPT-6
- **Task:** Hackathon: build something small with Quip in an hour
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Hackathon: build something small with Quip in an hour | GPT-6 | xquad/xqsa (local CPU solver) | Works locally; no network job, because Submit a Job then said testnet details were unpublished | ~7 min | [C-CMP-01, C-TRL-21]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-6.
- **What it does:** Encodes a room-assignment Max-Cut problem as a QUBO with Quip's XQMX model and solves it locally with `xqsa`'s CPU annealer, unit-tested against a brute-force optimum.
- **Quip products and integration:** `xquad`/`xqvm-py` XQMX + `xqsa` `SolverDWaveCPU` — NATIVE, local only; a live network job was not attempted because, at the time of the trial, Submit a Job said the testnet connection details were unpublished.
- **Evidence:** Local only, no chain calls. Both independent rebuilds reproduced cut 44 = exact optimum 44 and found the model matches the XQuad book's Max-Cut formula; one rebuild also confirmed the optimum with its own brute-force enumeration. Our own re-run on 2026-09-29 also worked.
- **Time:** 7 min.
- **Key Quip call** (`demo.py:16-28`, excerpt):
```python
model = XQMX.binary_model(size=len(names))
...
    # Quip's documented Max-Cut QUBO: H = -sum(w * XOR(x_i,x_j)).
    model.add_linear(i, -weight)
    model.add_linear(j, -weight)
    model.add_quadratic(i, j, 2 * weight)

result = SolverDWaveCPU(seed=seed, num_reads=reads).solve(model)
```
- **What got in the way:** At the time of the trial, Submit a Job said the public testnet connection details were unpublished, so the builder skipped a live network job [[C-CMP-01](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Connection%20details%20for%20the%20public%20test%20network%20have%20not%20been%20published%20yet)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
