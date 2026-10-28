#!/usr/bin/env python3.13
"""Explore the result object structure."""

from xqvm_py import XQMX
from xqsa import SolverDWaveCPU

model = XQMX.binary_model(size=4)
model.set_linear(0, -1)
model.set_quadratic(0, 1, 2)

solver = SolverDWaveCPU()
result = solver.solve(model)

print("Type of result:", type(result))
print("Dir of result:", [a for a in dir(result) if not a.startswith('_')])
print()
print("result.sample type:", type(result.sample))
print("result.sample dir:", [a for a in dir(result.sample) if not a.startswith('_')])
print()
print("result.energy:", result.energy)
print()

# Try to access as array
try:
    print("result.sample.as_array():", result.sample.as_array())
except Exception as e:
    print("as_array() failed:", e)

try:
    print("result.sample.tolist():", result.sample.to_list())
except Exception as e:
    print("to_list() failed:", e)

try:
    import numpy as np
    arr = np.array(result.sample)
    print("np.array(sample):", arr)
except Exception as e:
    print("np.array failed:", e)

try:
    print("result.sample[:]:", result.sample[:])
except Exception as e:
    print("slice failed:", e)

try:
    print("result.sample.values:", result.sample.values)
except Exception as e:
    print(".values failed:", e)

try:
    print("result.sample.linear_terms:", result.sample.linear_terms)
except Exception as e:
    print(".linear_terms failed:", e)

try:
    print("result.sample.quadratic_terms:", result.sample.quadratic_terms)
except Exception as e:
    print(".quadratic_terms failed:", e)
