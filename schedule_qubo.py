"""Job scheduling QUBO for the Quip Network XQuad toolchain.

Problem: 6 jobs with durations [3,5,2,7,4,6] onto 3 machines, minimise load imbalance.
Formulation (QUBO, binary):
  variables x[i][m] = 1 iff job i runs on machine m   (6*3 = 18 binary vars)
  E = sum_m (sum_i d_i * x[i][m])^2                 # squared machine loads
      + P * sum_i (sum_m x[i][m] - 1)^2             # one machine per job

Minimising the sum of squared loads is the standard balance surrogate: total load
is fixed, so the squared sum is smallest exactly when loads are equal.

Expanded to (linear, quadratic) coefficients used by XQMX:
  linear[i,m]                    = d_i^2 - P
  quadratic[(i,m),(j,m)]  (i<j)  = 2 * d_i * d_j     (same machine)
  quadratic[(i,m),(i,m')] (m<m') = 2 * P             (same job, different machines)
"""

from __future__ import annotations

JOBS = [3, 5, 2, 7, 4, 6]  # durations
N_JOBS = len(JOBS)
N_MACHINES = 3
# Empirical sweet spot. P=1000 makes the optimum a shallow local min behind a big
# barrier (SA found it only 14/20 locally; the network's first job returned a valid
# but suboptimal schedule). P<=100 lets SA drop feasibility. P=200 is 20/20 valid and
# 20/20 optimal locally, and still strictly dominates: min infeasible energy is
# 209 + P = 409 > 243 = the true optimum, so no violation can win.
PENALTY = 200


def var(i: int, m: int) -> int:
    return i * N_MACHINES + m


def build_model():
    from xqvm_py import XQMX

    model = XQMX.binary_model(size=N_JOBS * N_MACHINES)
    # linear: d_i^2 for the load term, -P for the penalty expansion
    for i in range(N_JOBS):
        for m in range(N_MACHINES):
            model.set_linear(var(i, m), JOBS[i] ** 2 - PENALTY)
    # quadratic within the same machine: 2 d_i d_j
    for m in range(N_MACHINES):
        for i in range(N_JOBS):
            for j in range(i + 1, N_JOBS):
                model.set_quadratic(var(i, m), var(j, m), 2 * JOBS[i] * JOBS[j])
    # quadratic within the same job: 2 P
    for i in range(N_JOBS):
        for m in range(N_MACHINES):
            for mm in range(m + 1, N_MACHINES):
                model.set_quadratic(var(i, m), var(i, mm), 2 * PENALTY)
    return model


def decode(sample) -> list[list[int]]:
    """Return machine -> list of job indices, from a binary XQMX sample."""
    assign = [None] * N_JOBS
    for i in range(N_JOBS):
        for m in range(N_MACHINES):
            if sample.get_linear(var(i, m)) == 1:
                assign[i] = m
    machines: list[list[int]] = [[] for _ in range(N_MACHINES)]
    for i, m in enumerate(assign):
        if m is not None:
            machines[m].append(i)
    return machines


def loads_from_assign(assign):
    loads = [0, 0, 0]
    for i, m in enumerate(assign):
        loads[m] += JOBS[i]
    return loads


def brute_force_optimum():
    """Exhaustive search over 3^6 assignments -> (min sum of squared loads, best assignment)."""
    best = None
    for code in range(N_MACHINES ** N_JOBS):
        assign = []
        c = code
        for _ in range(N_JOBS):
            assign.append(c % N_MACHINES)
            c //= N_MACHINES
        loads = loads_from_assign(assign)
        score = sum(x * x for x in loads)
        if best is None or score < best[0]:
            best = (score, assign[:], loads[:])
    return best


def imbalance(loads) -> int:
    return max(loads) - min(loads)


if __name__ == "__main__":
    import sys

    mode = sys.argv[1] if len(sys.argv) > 1 else "local"

    print(f"Jobs (durations): {JOBS}")
    print(f"Total load = {sum(JOBS)}, ideal per machine = {sum(JOBS)/N_MACHINES}")
    score, assign, loads = brute_force_optimum()
    print(f"[brute force] best sum-of-squares = {score}, loads = {loads}, "
          f"imbalance = {imbalance(loads)}, assign(job->machine) = {assign}")

    model = build_model()
    print(f"model: {model!r}")
    print(f"  linear terms: {len(model.linear)}, quadratic terms: {len(model.quadratic)}")

    if mode == "local":
        from xqsa import SolverDWaveCPU

        result = SolverDWaveCPU(seed=42).solve(model)
        machines = decode(result.sample)
        l = loads_from_assign(
            [next(m for m in range(N_MACHINES) if i in machines[m]) for i in range(N_JOBS)]
        )
        print(f"[local SolverDWaveCPU] energy = {result.energy}")
        print(f"  machines (job indices, 0-based) = {machines}")
        print(f"  machine durations               = "
              f"{[[JOBS[i] for i in ms] for ms in machines]}")
        print(f"  loads = {l}, imbalance = {imbalance(l)}")
        print(f"  metadata = {result.metadata}")
    elif mode == "quip":
        from xqsa import SolverQuip

        solver = SolverQuip.for_network(
            "aglais",
            topology="native",
            keystore="keys/keystore.json",
            autoconfirm=True,
            autofund=True,
        )
        q = solver.quote(model)
        print("[quip] quote:", q)
        result = solver.solve(model)
        machines = decode(result.sample)
        l = loads_from_assign(
            [next(m for m in range(N_MACHINES) if i in machines[m]) for i in range(N_JOBS)]
        )
        print(f"[Quip network] energy = {result.energy}")
        print(f"  machines (job indices, 0-based) = {machines}")
        print(f"  machine durations               = "
              f"{[[JOBS[i] for i in ms] for ms in machines]}")
        print(f"  loads = {l}, imbalance = {imbalance(l)}")
        print(f"  metadata = {result.metadata}")
    else:
        raise SystemExit(f"unknown mode {mode!r}")
