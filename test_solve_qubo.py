"""Deterministic checks for the shared QUBO and local Quip solver path."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from solve_qubo import (
    build_model,
    exact_ground_states,
    model_description,
    objective,
    run_local,
)


class QuboTest(unittest.TestCase):
    def test_exact_ground_state_is_unique(self) -> None:
        self.assertEqual(exact_ground_states(), (-7, [[1, 0, 1, 0]]))

    def test_model_has_expected_shape(self) -> None:
        model = build_model()
        self.assertEqual(model.size, 4)
        self.assertEqual(model_description()["domain"], "BINARY")

    def test_objective(self) -> None:
        self.assertEqual(objective([1, 0, 1, 0]), -7)
        self.assertEqual(objective([1, 1, 1, 1]), 8)

    def test_local_solver_reaches_exact_optimum(self) -> None:
        with tempfile.TemporaryDirectory(dir=".") as directory:
            output = Path(directory) / "local.json"
            result = run_local(output)
            self.assertTrue(output.exists())
            self.assertEqual(result["sample"], [1, 0, 1, 0])
            self.assertEqual(result["energy"], -7)
            self.assertTrue(result["is_global_optimum"])


if __name__ == "__main__":
    unittest.main()
