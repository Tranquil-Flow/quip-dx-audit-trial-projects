# m3-b

- **Round:** Round 2
- **Model:** GPT-5.6
- **Task:** Portfolio QUBO on Quip compute, with the result recorded in a contract on Aglais
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Portfolio QUBO on Quip compute, with the result recorded in a contract on Aglais | GPT-5.6 | xqsa compute; Aglais EVM (its own registry contract) | Built and working on testnet | ~31 min | [C-R4-21]. A raw PolkaVM deploy attempt never entered the chain [C-TRL-32]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-5.6.
- **What it does:** An 8-asset QUBO that picks one asset from each of two four-asset sectors (two disjoint one-hot groups), so the model fits the hardware topology without minor embedding. The job id, asset mask, energy and a result hash are stored by the constructor of a small immutable Solidity contract, and a Node script reads the record back and checks it against the local result file.
- **Quip products and integration:** `xqsa` compute — NATIVE (live); Aglais EVM registry — CHAIN_ONLY.
- **Evidence:** compute order 144 on Aglais Substrate (4 solver submissions, returned energy matches the chain); registry contract [0x86846DC4136DB93d067b6fF6F78D8882FfF7589a](https://explorer.aglais.quip.network/address/0x86846DC4136DB93d067b6fF6F78D8882FfF7589a), deploy tx [0x7f7621ad1229b120f6cab0e677b2f8693702465d13db140856d887f9346a1ccc](https://explorer.aglais.quip.network/tx/0x7f7621ad1229b120f6cab0e677b2f8693702465d13db140856d887f9346a1ccc). Rebuilds: one (order 159) and the other (order 160) each deployed a fresh record. Our own re-run on 2026-09-29 (order 173) also worked.
- **Time:** 31 min.
- **Key Quip call** (`scripts/portfolio_job.py:106-124`, excerpt):
```python
kwargs: dict[str, Any] = {
    "keystore": str(keystore),
    "autoconfirm": True,
    "autofund": True,
    "timeout": 900.0,
}
...
solver = SolverQuip.for_network(network, **kwargs)
...
    quote = solver.quote(model)
    print(quote)
    result = solver.solve(model)
    job_id = int(result.metadata["order_id"])
```
- **What got in the way:** Same missing compute-to-contract bridge as `m3-a` [[C-R4-21](https://developers.quip.network/docs/getting-started/quickstart#:~:text=we%20are%20building%20out%20the%20smart%20contract%20layer%20so%20you%20can%20take%20advantage%20of%20the%20quantum%20computers%20too)]; a raw PolkaVM (resolc) deploy attempt never entered the chain and was abandoned in favor of plain solc [[C-TRL-32](https://agls.quip.network#:~:text=pallet-revive)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
