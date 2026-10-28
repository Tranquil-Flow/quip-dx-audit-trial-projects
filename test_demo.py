import itertools
import unittest

from xqsa import SolverDWaveCPU

from demo import CONFLICTS, PROJECTS, REWARDS, energy, make_model


class ProjectPickerTests(unittest.TestCase):
    def test_model_matches_independent_score_for_every_choice(self):
        model = make_model()
        for bits in itertools.product((0, 1), repeat=len(PROJECTS)):
            encoded = sum(model.get_linear(i) * bit for i, bit in enumerate(bits))
            encoded += sum(
                model.get_quadratic(i, j) * bits[i] * bits[j]
                for i, j in CONFLICTS
            )
            self.assertEqual(encoded, energy(bits))
        self.assertEqual(tuple(-model.get_linear(i) for i in range(len(PROJECTS))), REWARDS)

    def test_documented_local_quip_solver_finds_optimum(self):
        result = SolverDWaveCPU().solve(make_model())
        bits = tuple(result.sample.get_linear(i) for i in range(len(PROJECTS)))
        best = min(energy(candidate) for candidate in itertools.product((0, 1), repeat=len(PROJECTS)))
        self.assertEqual(result.energy, energy(bits))
        self.assertEqual(result.energy, best)


if __name__ == "__main__":
    unittest.main()
