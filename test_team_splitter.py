import unittest

from team_splitter import DEFAULT_GRAPH, build_model, cut_count, exact_best, solve, validate_graph


class TeamSplitterTest(unittest.TestCase):
    def test_default_demo_reaches_optimum(self):
        people, links, bits, score, energy = solve(seed=7)
        self.assertEqual(len(bits), len(people))
        self.assertEqual(score, exact_best(len(people), links))
        self.assertEqual(energy, -2 * score)

    def test_model_represents_every_assignment(self):
        people, links = validate_graph(DEFAULT_GRAPH)
        model = build_model(people, links)
        from itertools import product

        for bits in product((0, 1), repeat=len(people)):
            energy = sum(model.get_linear(i) * bit for i, bit in enumerate(bits))
            energy += sum(value * bits[a] * bits[b]
                          for (a, b), value in model.iter_quadratic())
            self.assertEqual(energy, -2 * cut_count(bits, links))

    def test_duplicate_edge_rejected(self):
        with self.assertRaisesRegex(ValueError, "repeat"):
            validate_graph({"people": ["A", "B"], "links": [[0, 1], [1, 0]]})

    def test_triangle_cannot_cut_all_edges(self):
        graph = {"people": ["A", "B", "C"], "links": [[0, 1], [1, 2], [0, 2]]}
        self.assertEqual(exact_best(3, graph["links"]), 2)
        self.assertEqual(solve(graph)[3], 2)


if __name__ == "__main__":
    unittest.main()
