"""Read a Quip order back from the chain (on-chain evidence).

Usage: .venv/bin/python query_order.py <order_id>
"""

import sys

from qubo_scheduling import build_model
from xqsa import SolverQuip

order_id = int(sys.argv[1])
solver = SolverQuip.for_network("aglais", keystore="keys/keystore.json", topology="native")
print(f"--- status(order_id={order_id}) ---")
print(solver.status(order_id))

model = build_model()
result = solver.query(order_id, model, topology="native")
if result is None:
    print("query(): order not final yet (or no result)")
else:
    values = [result.sample.linear.get(i, 0) for i in range(18)]
    print(f"--- query(order_id={order_id}) ---")
    print(f"energy        : {result.energy}")
    print(f"metadata      : {result.metadata}")
    print(f"sample values : {values}")
