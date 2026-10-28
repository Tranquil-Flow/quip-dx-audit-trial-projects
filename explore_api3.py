#!/usr/bin/env python3.13
"""Probe XQMX sample - v3."""

from xqvm_py import XQMX
from xqsa import SolverDWaveCPU

model = XQMX.binary_model(size=4)
model.set_linear(0, -1)
model.set_quadratic(0, 1, 2)

solver = SolverDWaveCPU()
result = solver.solve(model)

sample = result.sample
print("linear dict:", sample.linear)
print("quadratic dict:", sample.quadratic)

# Build full assignment
assignment = {}
for idx, val in sample.iter_linear():
    assignment[idx] = val
# Variables with no linear term are implicitly 0? Or maybe we need to check iter_quadratic
print()
print("Assignment from iter_linear:", assignment)

# Check if there's iter_quadratic for sample
for item in sample.iter_quadratic():
    print("quadratic item:", item)

print()
print("sample.size:", sample.size)

# The assignment should have size entries
# Let's construct the full vector
full = [0] * sample.size
for idx, val in sample.iter_linear():
    full[idx] = val
print("Full assignment vector:", full)

print()
print("result.energy:", result.energy)
print("result.metadata:", result.metadata)
print("result.timing:", result.timing)
