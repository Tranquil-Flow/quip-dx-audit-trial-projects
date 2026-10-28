import itertools
import unittest

from xqvm_py.xqmx import compute_energy

import schedule_qubo as sq


class SchedulingQuboTests(unittest.TestCase):
    def test_qubo_expansion_matches_original_objective_for_all_bits(self):
        model = sq.build_model()
        for bits_tuple in itertools.product((0, 1), repeat=len(sq.DURATIONS) * sq.N_MACHINES):
            bits = list(bits_tuple)
            sample = sq.XQMX.binary_sample(model.size)
            for idx, bit in enumerate(bits):
                sample.set_linear(idx, bit)
            qubo_plus_constant = int(compute_energy(model, sample)) + sq.CONSTANT_OFFSET
            self.assertEqual(qubo_plus_constant, sq.decode(bits)["objective_F"])

    def test_exact_optimum_is_perfectly_balanced(self):
        optimum = sq.exact_valid_optimum()
        self.assertEqual(optimum["minimum_squared_imbalance"], 0)
        self.assertEqual(optimum["number_of_labelled_optima"], 6)
        self.assertEqual(optimum["first_optimum"]["loads"], [9, 9, 9])


if __name__ == "__main__":
    unittest.main()
