"""Submit the scheduling QUBO to the Quip Network several times, record every result.

Each solve is one on-chain job (~1 AGLS reward + ~0.002 fee, AGLS = valueless testnet
token). Stops early if the balanced optimum (sum-of-squares 243, energy -957) is found.
Appends every attempt to quip_attempts.json.
"""
from __future__ import annotations
import json
import schedule_qubo as sq
from xqsa import SolverQuip


def main(n: int = 3):
    solver = SolverQuip.for_network(
        "aglais", topology="native", keystore="keys/keystore.json",
        autoconfirm=True, autofund=True,
    )
    model = sq.build_model()
    attempts = []
    for k in range(n):
        try:
            r = solver.solve(model)
        except Exception as exc:  # noqa: BLE001
            print(f"attempt {k}: ERROR {type(exc).__name__}: {exc}")
            attempts.append({"attempt": k, "error": f"{type(exc).__name__}: {exc}"})
            continue
        machines = sq.decode(r.sample)
        assign = [next(m for m in range(sq.N_MACHINES) if i in machines[m]) for i in range(sq.N_JOBS)]
        loads = sq.loads_from_assign(assign)
        rec = {
            "attempt": k,
            "order_id": r.metadata.get("order_id"),
            "miner": r.metadata.get("solver"),
            "energy": r.energy,
            "best_energy_milli": r.metadata.get("best_energy_milli"),
            "energy_matches_chain": r.metadata.get("energy_matches_chain"),
            "num_submissions": r.metadata.get("num_submissions"),
            "loads": loads,
            "assignment_job_to_machine": assign,
            "imbalance": sq.imbalance(loads),
            "sum_of_squares": sum(x * x for x in loads),
        }
        attempts.append(rec)
        print("RESULT:", json.dumps(rec))
        with open("quip_attempts.json", "w") as f:
            json.dump(attempts, f, indent=2)
        if rec["sum_of_squares"] == 243:
            print("found the balanced optimum; stopping early")
            break
    best = min((a for a in attempts if "sum_of_squares" in a), key=lambda a: a["sum_of_squares"], default=None)
    print("BEST:", json.dumps(best))


if __name__ == "__main__":
    import sys
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 3)
