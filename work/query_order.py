# -*- coding: utf-8 -*-
"""Recover order 177 from chain state via SolverQuip.query() (new process,
same keystore + model) and read the final account balance."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from qubo import build_model, sample_to_dict  # noqa: E402
from xqsa import SolverQuip  # noqa: E402

KEYSTORE = Path(__file__).resolve().parent.parent / "keys" / "keystore.json"
ORDER_ID = 177

model = build_model()
solver = SolverQuip.for_network("aglais", keystore=str(KEYSTORE))

res = solver.query(ORDER_ID, model)
print("order status snapshot:", json.dumps(solver.status(ORDER_ID), indent=2))
if res is None:
    print("order not yet final; try again later")
    sys.exit(1)
x = sample_to_dict(res.sample)
print("recovered sample :", [x[i] for i in range(model.size)])
print("recovered energy :", res.energy)
print("metadata         :", json.dumps(res.metadata))
balance = solver._free_balance()
print(f"final free balance: {balance} planck = {balance/1e12} AGLS")
