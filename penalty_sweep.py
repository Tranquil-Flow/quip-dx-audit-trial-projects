"""Local penalty sweep: which P lets the SA solver find the balanced optimum reliably?
SolverDWaveCPU is the same algorithm family as the miner fleet's CPU SA, so it is a
decent proxy for how hard the network will find the model.
"""
from __future__ import annotations
import schedule_qubo as sq
from xqvm_py import XQMX


def build(penalty: int):
    model = XQMX.binary_model(size=sq.N_JOBS * sq.N_MACHINES)
    for i in range(sq.N_JOBS):
        for m in range(sq.N_MACHINES):
            model.set_linear(sq.var(i, m), sq.JOBS[i] ** 2 - penalty)
    for m in range(sq.N_MACHINES):
        for i in range(sq.N_JOBS):
            for j in range(i + 1, sq.N_JOBS):
                model.set_quadratic(sq.var(i, m), sq.var(j, m), 2 * sq.JOBS[i] * sq.JOBS[j])
    for i in range(sq.N_JOBS):
        for m in range(sq.N_MACHINES):
            for mm in range(m + 1, sq.N_MACHINES):
                model.set_quadratic(sq.var(i, m), sq.var(i, mm), 2 * penalty)
    return model


def raw_assign(result):
    """Job -> machine index, or None if the job is not on exactly one machine."""
    a = []
    for i in range(sq.N_JOBS):
        ms = [m for m in range(sq.N_MACHINES) if result.sample.get_linear(sq.var(i, m)) == 1]
        a.append(ms[0] if len(ms) == 1 else None)
    return a


def main():
    from xqsa import SolverDWaveCPU
    for P in (20, 50, 100, 200, 400, 1000):
        runs = 20
        valid = 0
        opt = 0
        bvalid = None
        for s in range(runs):
            r = SolverDWaveCPU(seed=s, num_reads=100).solve(build(P))
            a = raw_assign(r)
            if None in a:
                continue
            valid += 1
            loads = sq.loads_from_assign(a)
            sc = sum(x * x for x in loads)
            if bvalid is None or sc < bvalid[0]:
                bvalid = (sc, loads)
            if sc == 243:
                opt += 1
        print(f"P={P:5d}  valid {valid:2d}/{runs}   optimal {opt:2d}/{runs}   best-valid={bvalid}")


if __name__ == "__main__":
    main()
