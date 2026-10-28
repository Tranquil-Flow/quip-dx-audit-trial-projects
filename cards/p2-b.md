# p2-b

- **Round:** Round 5
- **Model:** MiMo-V2.5
- **Task:** Python dev, pip only: PQ signing demo and a QUBO compute job
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Python dev, pip only: PQ signing demo and a QUBO compute job | MiMo-V2.5 | quip-signer; xqsa compute (never reached) | Partly working: the signing demo works; the compute script was never run and crashes at its local-solve step; no network job | 67 min | No macOS wheels; nothing points to the Python signing usage [C-CMP-11, C-PER-05]. The write-up calls the unrun compute script "complete". Both rebuilds rated it partly working. |

## Trial card

- **Model:** MiMo-V2.5.
- **What it does:** `sign_demo.py` makes a fresh `quip-signer` H4 hybrid key (929-byte public key), signs, verifies and shows a tampered message, signature and account id all fail. `compute_job.py` formulates the same 18-variable QUBO (penalty 100, target 9), brute-forces it, solves it locally with `SolverDWaveCPU` and is written to submit through `SolverQuip.for_network('aglais', topology='native')`. It never ran successfully, and the builder stopped before the full install finished.
- **Quip products and integration:** `quip-signer` — NATIVE; `xquad`/`xqsa` compute — NONE (the network step was never reached).
- **Evidence:** No transactions, addresses or job ids were claimed. First rebuild: partly working (a clean `pip install -r requirements.txt` on a Mac needed source builds of `xqffi` and `quip-signer`, about 11 minutes; `sign_demo.py` printed true, false, false, false and exited 0; `compute_job.py` crashes at line 163, where `decode(local.sample)` raises `TypeError: 'XQMX' object is not iterable`, before any network step). Second rebuild: partly working (the signing demo works; the compute script is unfinished and was never run, as the first rebuild found). The write-up overclaims: it calls `compute_job.py` "COMPLETE" and says the documented flow works as written on a normal network, but the script was never run and crashes locally. The signing demo itself ran only through a hand-built extension module and a `PYTHONPATH` workaround, not through `requirements.txt`, which the write-up discloses.
- **Time:** 67 min.
- **Key Quip call** (`sign_demo.py:60, 75, 83`, excerpt):
```python
    return bool(quip_signer.verify_envelope(payload, envelope, account_id))
...
signer = quip_signer.HybridSigner.from_seed(seed)
...
envelope = signer.sign(MESSAGE)
```
- **What got in the way:** No macOS wheels for `quip-signer` or `xqffi`; a manual `cargo build` also fails to link without an undocumented macOS flag [[C-CMP-11](https://pypi.org/project/xqffi/0.4.1/)]. The Quickstart lists Rust, C++, TypeScript and Solidity libraries but no Python, and the `quip-signer` PyPI description is empty and nothing links its usage README, so the builder read the sdist's `.pyi` files and tests [[C-PER-05](https://pypi.org/project/quip-signer/)].
