import json
import unittest
from pathlib import Path
from demo import solve


class DemoTests(unittest.TestCase):
    def test_sample_is_optimal(self):
        data = json.loads(Path(__file__).with_name("interactions.json").read_text())
        result = solve(data)
        self.assertEqual(result["cut_weight"], 44)
        self.assertEqual(result["energy"], -44)
        self.assertTrue(result["optimal"])
        self.assertFalse(result["network_job"])
        self.assertEqual(sorted(result["rooms"]["A"] + result["rooms"]["B"]), sorted(data["people"]))

    def test_triangle(self):
        result = solve({"people": ["a", "b", "c"], "interactions":
                        [["a", "b", 3], ["b", "c", 5], ["a", "c", 2]]})
        self.assertEqual(result["cut_weight"], 8)
        self.assertTrue(result["optimal"])

    def test_reject_invalid_input(self):
        with self.assertRaises(ValueError):
            solve({"people": ["a", "a"], "interactions": []})
        with self.assertRaises(ValueError):
            solve({"people": ["a", "b"], "interactions": [["a", "b", -1]]})


if __name__ == "__main__":
    unittest.main()
