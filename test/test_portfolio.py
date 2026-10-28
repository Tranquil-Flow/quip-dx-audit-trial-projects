from scripts.portfolio_job import (
    build_model,
    brute_force,
    canonical_payload,
    load_problem,
    objective,
    payload_hash,
)


def test_known_optimum_and_qubo_energy():
    problem = load_problem()
    bits, human_energy = brute_force(problem)
    assert bits == [0, 1, 0, 0, 0, 0, 1, 0]
    assert human_energy == 3
    assert objective(problem, bits) == 3

    model = build_model(problem)
    qubo_energy = sum(model.get_linear(i) * bits[i] for i in range(8))
    qubo_energy += sum(model.get_quadratic(i, j) * bits[i] * bits[j] for i in range(8) for j in range(i + 1, 8))
    assert qubo_energy == -37  # human objective minus two omitted constants of 20


def test_canonical_payload_and_hash():
    problem = load_problem()
    payload = canonical_payload(123, [0, 1, 0, 0, 0, 0, 1, 0], -37, problem)
    assert payload["asset_mask"] == 66
    assert payload["selected_symbols"] == ["BRAV", "GAMA"]
    assert payload_hash(payload) == "0x1e4abe36d0c7ab002d03d77aebe044631dde7c18f5fc85a9aa36acd49eeaa20e"
