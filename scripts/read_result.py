"""Read results back from QuipResultRegistry and (optionally) cross-check them.

Usage:
  .venv/bin/python scripts/read_result.py              # list every stored result
  .venv/bin/python scripts/read_result.py --job 145    # one result by Quip job id
  add --verify to also:
    1. re-derive the QUBO from quantum/portfolio.py and compare its hash with problemHash,
    2. recompute the energy of the stored selection and compare with energyMilli,
    3. fetch the job from the Quip Substrate chain (QuantumComputeMempool.JobOrders / OrderSolutions)
       and check the stored solver really submitted that selection for that job.
No keys are needed; everything is read-only.
"""
import argparse, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "quantum"))
from common import DEPLOY, contract

QUIP_WS = "wss://bootnode-1.aglais.quip.network:20049/rpc"


def show(i, r):
    job, phash, sel, e, solver, topo, assets, who, ts = r
    names = assets.split(",")
    chosen = [names[b] for b in range(len(names)) if sel >> b & 1]
    print(f"#{i} jobId={job} selection=0b{sel:08b} ({sel}) -> {chosen}")
    print(f"   energyMilli={e} problemHash=0x{phash.hex()}")
    print(f"   solver=0x{solver.hex()} topology=0x{topo.hex()}")
    print(f"   submitter={who} timestamp={ts}")


def verify(r):
    import portfolio as pf
    from substrateinterface.utils.ss58 import ss58_decode
    from xqsa import quip_metadata

    job, phash, sel, e, solver, topo, assets, *_ = r
    bits = [sel >> b & 1 for b in range(8)]
    lin, quad = pf.qubo()
    ok = {}
    ok["problem hash matches local QUBO"] = "0x" + phash.hex() == pf.problem_hash()
    ok["energy matches recomputation"] = round(pf.energy(bits, lin, quad) * 1000) == e
    ok["one asset per sleeve (feasible)"] = all(bits[a] + bits[b] == 1 for a, b in pf.SLEEVES)

    iface = quip_metadata.connect(QUIP_WS)
    order = iface.query("QuantumComputeMempool", "JobOrders", [job]).value
    if order is None:
        print("   Quip chain: order not found (results may have expired: ResultTtlBlocks)")
    else:
        print(f"   Quip chain order {job}: status={order['status']} mode={order['mode']} created_at={order['created_at']}")
        # The spin vector for our selection: spin = 2x - 1, positioned by the job's node list.
        # Placement maps variable i -> nodes in sorted order for this model (see placed_nodes in out/*.json).
        target = [2 * b - 1 for b in bits]
        found = None
        for _, v in iface.query_map("QuantumComputeMempool", "OrderSolutions", [job]):
            s = v.value
            match = "0x" + ss58_decode(s["solver"]) == "0x" + solver.hex()
            print(f"     submission by {s['solver']} type={s['solver_type']} best_energy_milli={s['best_energy_milli']}"
                  f" solutions={s['solutions']}{'  <- recorded solver' if match else ''}")
            if match:
                found = s
        ok["recorded solver submitted to this job"] = found is not None
        ok["recorded selection is in solver's submission"] = bool(found) and target in [list(x) for x in found["solutions"]]
        if found:
            print(f"   winning hardware type reported on-chain: {found['solver_type']}")
    for k, v in ok.items():
        print(f"   [{'OK' if v else 'FAIL'}] {k}")
    return all(ok.values())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--job", type=int)
    ap.add_argument("--verify", action="store_true")
    a = ap.parse_args()
    w3, reg = contract()
    print(f"QuipResultRegistry {reg.address} on chainId {w3.eth.chain_id} ({DEPLOY['evmRpc']})")
    if a.job is not None:
        idx = reg.functions.indexByJobId(a.job).call()
        if not idx:
            sys.exit(f"job {a.job} not recorded")
        items = [(idx - 1, reg.functions.get(idx - 1).call())]
    else:
        items = [(i, reg.functions.get(i).call()) for i in range(reg.functions.count().call())]
    good = True
    for i, r in items:
        show(i, r)
        if a.verify:
            good &= verify(r)
    sys.exit(0 if good else 1)


if __name__ == "__main__":
    main()
