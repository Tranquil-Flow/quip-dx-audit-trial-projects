"""Scheduling problem as a QUBO, solved locally with Quip Network tooling.

Problem: assign 6 jobs (durations 3,5,2,7,4,6) to 3 machines, every job on
exactly one machine, minimizing load imbalance.

Variables: x[i,j] in {0,1} = job i assigned to machine j (18 binaries).

QUBO (natural scale, integers):

  H = A * sum_i (sum_j x[i,j] - 1)^2          # one-hot: each job once
    + B * sum_j (sum_i d_i * x[i,j])^2        # balance: squared machine loads

Because the total load 27 is fixed, minimizing sum_j L_j^2 is equivalent to
minimizing sum_j (L_j - mean)^2, i.e. the imbalance (and max-min too: the
perfect split [9,9,9] achieves the global minimum of every variant).

Expansion into coefficients (x is binary so x^2 = x):

  one-hot, per job i:    linear -A on each x[i,j]
                         quadratic +2A on each pair x[i,j]x[i,k], j<k
  balance, per machine j: linear +B*d_i^2 on x[i,j]
                          quadratic +2B*d_i*d_i' on x[i,j]x[i',j], i<i'

Penalty weight A=1000 >> spread of the balance term (243..729 over valid
assignments), so any one-hot violation costs more than the worst valid
assignment and the global optimum is a valid, perfectly balanced one.
"""

from itertools import product

from xqsa import SolverDWaveCPU
from xqvm_py import XQMX

DURATIONS = [3, 5, 2, 7, 4, 6]
N_JOBS = len(DURATIONS)
N_MACHINES = 3
PENALTY = 1000  # A: one-hot constraint weight
BALANCE = 1     # B: squared-load weight
TOTAL_LOAD = sum(DURATIONS)


def var(i: int, j: int) -> int:
    """Variable index for job i on machine j."""
    return i * N_MACHINES + j


def build_model() -> XQMX:
    """Build the 18-variable binary QUBO for the scheduling problem."""
    model = XQMX.binary_model(size=N_JOBS * N_MACHINES)

    # --- one-hot penalty: A * (sum_j x[i,j] - 1)^2 ---
    for i in range(N_JOBS):
        for j in range(N_MACHINES):
            model.add_linear(var(i, j), -PENALTY)
            for k in range(j + 1, N_MACHINES):
                model.add_quadratic(var(i, j), var(i, k), 2 * PENALTY)

    # --- balance objective: B * sum_j (sum_i d_i x[i,j])^2 ---
    for j in range(N_MACHINES):
        for i in range(N_JOBS):
            model.add_linear(var(i, j), BALANCE * DURATIONS[i] ** 2)
            for i2 in range(i + 1, N_JOBS):
                model.add_quadratic(
                    var(i, j), var(i2, j),
                    2 * BALANCE * DURATIONS[i] * DURATIONS[i2],
                )
    return model


def qubo_energy(model: XQMX, values: list[int]) -> int:
    """Recompute QUBO energy from variable values (constant term = 0)."""
    e = sum(c * values[i] for i, c in model.iter_linear())
    e += sum(c * values[i] * values[j] for (i, j), c in model.iter_quadratic())
    return e


def decode(values: list[int]) -> tuple[list[int], list[int]]:
    """Decode x[i,j] bits into (assignment per job, machine loads)."""
    assignment = []
    for i in range(N_JOBS):
        machines = [j for j in range(N_MACHINES) if values[var(i, j)] == 1]
        assignment.append(machines[0] if len(machines) == 1 else -1)
    loads = [0] * N_MACHINES
    for i, j in enumerate(assignment):
        if j >= 0:
            loads[j] += DURATIONS[i]
    return assignment, loads


def report(tag: str, values: list[int], energy: int) -> None:
    assignment, loads = decode(values)
    imbalance = max(loads) - min(loads)
    valid = all(v in (0, 1) for v in values) and all(
        sum(values[var(i, j)] for j in range(N_MACHINES)) == 1 for i in range(N_JOBS)
    )
    print(f"--- {tag} ---")
    print(f"  job -> machine : {assignment}")
    print(f"  machine loads  : {loads}  (total {sum(loads)}, ideal {TOTAL_LOAD / N_MACHINES:g})")
    print(f"  imbalance      : max-min = {imbalance}")
    print(f"  QUBO energy    : {energy}")
    print(f"  one-hot valid  : {valid}")
    print(f"  sum L^2        : {sum(l * l for l in loads)}")


def brute_force() -> tuple[int, list[int]]:
    """Exhaust all 3^6 assignments; return (best_energy, best_values)."""
    best_e, best_v = None, None
    for combo in product(range(N_MACHINES), repeat=N_JOBS):
        values = [0] * (N_JOBS * N_MACHINES)
        for i, j in enumerate(combo):
            values[var(i, j)] = 1
        e = qubo_energy(MODEL, values)
        if best_e is None or e < best_e:
            best_e, best_v = e, values
    return best_e, best_v


def brute_force_values() -> list[int]:
    """Exhaust all 3^6 assignments; return the values of a global optimum."""
    model = build_model()
    best_e, best_v = None, None
    for combo in product(range(N_MACHINES), repeat=N_JOBS):
        values = [0] * (N_JOBS * N_MACHINES)
        for i, j in enumerate(combo):
            values[var(i, j)] = 1
        e = qubo_energy(model, values)
        if best_e is None or e < best_e:
            best_e, best_v = e, values
    return best_v


if __name__ == "__main__":
    print("Scheduling QUBO: 6 jobs", DURATIONS, "->", N_MACHINES, "machines")
    print(f"variables={N_JOBS * N_MACHINES}  penalty A={PENALTY}  balance B={BALANCE}")
    print(f"total load={TOTAL_LOAD}, ideal per machine={TOTAL_LOAD / N_MACHINES:g}")

    MODEL = build_model()
    print(f"model terms: {len(list(MODEL.iter_linear()))} linear, "
          f"{len(list(MODEL.iter_quadratic()))} quadratic")

    # --- reference optimum by exhaustive enumeration ---
    best_e, best_v = brute_force()
    report("brute force (3^6 = 729 assignments)", best_v, best_e)

    # --- local solve with the Quip toolchain's CPU simulated-annealing solver ---
    solver = SolverDWaveCPU(num_reads=100, num_sweeps=1000, seed=42)
    result = solver.solve(MODEL)
    values = [result.sample.linear.get(i, 0) for i in range(N_JOBS * N_MACHINES)]
    print(f"\nlocal solver: SolverDWaveCPU  timing={result.timing:.3f}s  metadata={result.metadata}")
    report("SolverDWaveCPU (local, xqsa)", values, result.energy)
    print(f"\nlocal energy matches brute-force optimum: {result.energy == best_e}")
