# h3-a

- **Round:** Round 2
- **Model:** Claude Sonnet 5
- **Task:** Researcher: max-cut on Quip compute against classical solvers
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Researcher: max-cut on Quip compute against classical solvers | Claude Sonnet 5 | xqsa compute | Built and working on testnet (exact optimum) | ~9 min | At the time, Submit a Job said connection details were unpublished. The 20-node model needed `topology="native"` [C-CMP-01, C-TRL-17]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** Claude Sonnet 5.
- **What it does:** Builds a random 3-regular graph, computes max-cut by brute force and local simulated annealing, then submits the same model as an Ising job to Aglais compute and compares.
- **Quip products and integration:** `xqsa` `SolverQuip.for_network("aglais", autofund=True, autoconfirm=True)` — NATIVE.
- **Evidence:** the builder's compute orders 122 (N=16, default topology, 147 submissions) and 123 (N=20, `topology="native"`, 13 submissions) on Aglais, both at the exact optimum with `energy_matches_chain=True`. Rebuilds: one rebuild's orders 153 and 154 and the other's order 152 reproduced the result with fresh keys. Our own re-run on 2026-09-29 (order 175) also worked.
- **Time:** 9 min.
- **Key Quip call** (`maxcut.py:32-40`):
```python
if os.environ.get("QUIP") == "1":
    kw = {}
    if os.environ.get("NATIVE") == "1":
        kw["topology"] = "native"
    s = SolverQuip.for_network("aglais", keystore=os.path.abspath("keys/keystore.json"),
                               autoconfirm=True, autofund=True, **kw)
    t = time.time()
    q = s.solve(build_model())
    print("QUIP energy", q.energy, "cut", cut_of(sample_to_spins(q.sample)), f"({time.time()-t:.1f}s)")
```
- **What got in the way:** At the time of the trial, Submit a Job said connection details for the public testnet had not been published (fixed on 2026-09-29), so the builder found `SolverQuip.for_network("aglais")` in the installed package's docstrings and on aglais.quip.network instead [[C-CMP-01](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Connection%20details%20for%20the%20public%20test%20network%20have%20not%20been%20published%20yet)]. The N=20 model failed placement on the default topology and needed `topology="native"`, which Submit a Job did not mention at the snapshot; its "Placed or native" section was added on 2026-09-29 [[C-TRL-17](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Arbitrary%20problem%20shapes%20are%20not%20yet%20supported)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
