# m3-a

- **Round:** Round 2
- **Model:** Claude Opus 5.5
- **Task:** Portfolio QUBO on Quip compute, with the result recorded in a contract on Aglais
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Portfolio QUBO on Quip compute, with the result recorded in a contract on Aglais | Claude Opus 5.5 | xqsa compute; Aglais EVM (its own registry contract) | Built and working on testnet: live compute jobs, results recorded in its own contract | ~40 min | No documented path from compute results to contracts, and no deploy guide [C-R4-21, C-TRL-27]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** Claude Opus 5.5.
- **What it does:** Builds an 8-ETF portfolio QUBO reshaped to fit Aglais's hardware topology, submits it to Quip compute (optionally restricted to D-Wave-typed miners), and records the job id, solution and energy in a Solidity registry on Aglais, with a read-back/verify script.
- **Quip products and integration:** `xqsa` compute — NATIVE (live); Aglais EVM registry contract — CHAIN_ONLY (plain solc, not a Quip product).
- **Evidence:** compute orders 145 (open) and 147 (restricted to `QpuDwave` miners) on Aglais Substrate; registry contract [0x29ae4f0C3B375F1C4fD542974b64cf9DFC9DB8AE](https://explorer.aglais.quip.network/address/0x29ae4f0C3B375F1C4fD542974b64cf9DFC9DB8AE), `record()` tx for order 147 [0x7dc150d518058a4bb3156803bdb81695fc20b4c10fc9f82856b6ddf34fca8bc1](https://explorer.aglais.quip.network/tx/0x7dc150d518058a4bb3156803bdb81695fc20b4c10fc9f82856b6ddf34fca8bc1). Rebuilds: one (order 155) and the other (orders 161 and 165) recorded fresh jobs into the same registry. Our own re-run on 2026-09-29 (orders 176 and 178) also worked, after a `forge build` step the instructions leave out.
- **Time:** 40 min.
- **Key Quip call** (`quantum/solve.py:36-40`):
```python
if "--qpu" in sys.argv:
    kw = dict(mode={"Bid": {"miners": None, "miner_types": (["QpuDwave"],)}},
              deadline_blocks=int(os.environ.get("QUIP_DEADLINE_BLOCKS", 200)))
solver = SolverQuip.for_network("aglais", seed=seed, autoconfirm=True, autofund=True,
                                timeout=float(os.environ.get("QUIP_TIMEOUT", 1500)), **kw)
```
- **What got in the way:** No documented bridge from a compute result to an on-chain record, and no deploy guide for the registry contract, so both had to be worked out from source and trial and error [[C-R4-21](https://developers.quip.network/docs/getting-started/quickstart#:~:text=we%20are%20building%20out%20the%20smart%20contract%20layer%20so%20you%20can%20take%20advantage%20of%20the%20quantum%20computers%20too), [C-TRL-27](https://developers.quip.network/docs/llms.txt)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
