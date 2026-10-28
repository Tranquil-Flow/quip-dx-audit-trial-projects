"""Submit the portfolio QUBO to Quip Network (Aglais testnet) and save the result.

Usage: .venv/bin/python quantum/solve.py [--local | --qpu] [--quote]
  --local   solve with xqsa's local CPU simulated annealer instead (no network).
  --qpu     restrict the job to D-Wave QPU miners (JobMode::Bid{miner_types:[QpuDwave]}).
            Not supported by xqsa v0.4.1's public API ("Bid ... out of v1"); we pass the
            enum value straight through to substrate-interface's call encoder.
  --quote   build + price the job but do not submit it.
Writes out/quip_result.json (or out/quip_qpu_result.json with --qpu).
"""
import json, logging, os, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import portfolio as pf

ROOT = Path(__file__).resolve().parent.parent
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")


def sample_bits(sample) -> list[int]:
    return [int(sample.get_linear(i)) for i in range(8)]


def main():
    model = pf.to_xqmx()
    out = {"problem_hash": pf.problem_hash(), "assets": pf.ASSETS}
    if "--local" in sys.argv:
        from xqsa import SolverDWaveCPU
        res = SolverDWaveCPU(seed=1).solve(model)
        out.update(backend="local-cpu-sa")
    else:
        from xqsa import SolverQuip
        seed = (ROOT / "keys/quip-signer-seed.hex").read_text().strip()
        kw = {}
        if "--qpu" in sys.argv:
            kw = dict(mode={"Bid": {"miners": None, "miner_types": (["QpuDwave"],)}},
                      deadline_blocks=int(os.environ.get("QUIP_DEADLINE_BLOCKS", 200)))
        solver = SolverQuip.for_network("aglais", seed=seed, autoconfirm=True, autofund=True,
                                        timeout=float(os.environ.get("QUIP_TIMEOUT", 1500)), **kw)
        if "--quote" in sys.argv:
            print(solver.quote(model)); return
        job = solver._job_for(model, None, None)  # placement, for the record
        out.update(backend="quip-aglais", mode=str(solver._mode), deadline_blocks=solver._deadline_blocks, rpc=solver._url, topology=solver._topology_hash,
                   spec_id=solver._spec_id, placed_nodes=list(job.nodes) if hasattr(job, "nodes") else None,
                   signer=solver._signer.account_id.hex() if isinstance(solver._signer.account_id, bytes) else str(solver._signer.account_id))
        t = time.time()
        res = solver.solve(model)
        out["wall_seconds"] = round(time.time() - t, 1)
    bits = sample_bits(res.sample)
    out.update(selection=bits, bitmask=pf.bitmask(bits), chosen=pf.names(bits), energy=res.energy,
               stats=pf.portfolio_stats(bits),
               metadata={k: (v.hex() if isinstance(v, bytes) else v) for k, v in (res.metadata or {}).items()},
               brute_force_optimum=pf.names(pf.brute_force()[0]))
    (ROOT / "out").mkdir(exist_ok=True)
    name = ("local_result.json" if "--local" in sys.argv
            else "quip_qpu_result.json" if "--qpu" in sys.argv else "quip_result.json")
    (ROOT / "out" / name).write_text(json.dumps(out, indent=2, default=str))
    print(json.dumps(out, indent=2, default=str))


if __name__ == "__main__":
    main()
