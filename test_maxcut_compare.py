import itertools
import unittest

import maxcut_compare as demo


class MaxCutDemoTests(unittest.TestCase):
    def test_qubo_is_negative_cut_for_every_assignment(self) -> None:
        for bits in itertools.product((0, 1), repeat=demo.NODES):
            self.assertEqual(demo.qubo_energy(bits), -demo.cut_size(bits))

    def test_exact_solution(self) -> None:
        result = demo.exact_maxcut()
        self.assertEqual(result["states_checked"], 16)
        self.assertEqual(result["cut_size"], 4)
        self.assertEqual(result["qubo_energy"], -4)
        self.assertEqual(result["assignments"], [[0, 1, 0, 1], [1, 0, 1, 0]])

    def test_model_coefficients(self) -> None:
        model = demo.build_model()
        self.assertEqual([model.get_linear(i) for i in range(demo.NODES)], [-2, -2, -2, -2])
        for u, v in demo.EDGES:
            self.assertEqual(model.get_quadratic(u, v), 2)

    def test_local_solver_reaches_exact_optimum(self) -> None:
        result = demo.local_annealing(demo.build_model())
        self.assertEqual(result["cut_size"], 4)
        self.assertEqual(result["reported_energy"], -4)
        self.assertEqual(result["qubo_energy"], -4)


if __name__ == "__main__":
    unittest.main()
