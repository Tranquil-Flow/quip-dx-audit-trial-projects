#!/usr/bin/env python3.13
"""Probe XQMX sample object to understand how to read values."""

from xqvm_py import XQMX
from xqsa import SolverDWaveCPU

model = XQMX.binary_model(size=4)
model.set_linear(0, -1)
model.set_quadratic(0, 1, 2)

solver = SolverDWaveCPU()
result = solver.solve(model)

sample = result.sample
print("sample type:", type(sample))
print("sample.size:", sample.size)
print("sample.domain:", sample.domain)
print("sample.mode:", sample.mode)
print("sample.is_sample():", sample.is_sample())
print("sample.is_model():", sample.is_model())
print()

# Try iter_linear to read values
print("iter_linear():")
for item in sample.iter_linear():
    print("  ", type(item), item)

print()
print("linear(0):", sample.linear(0))
print("linear(1):", sample.linear(1))
print("linear(2):", sample.linear(2))
print("linear(3):", sample.linear(3))

# Try binary_sample / spin_sample
print()
try:
    bs = sample.binary_sample()
    print("binary_sample():", bs, type(bs))
except Exception as e:
    print("binary_sample() failed:", e)

try:
    ss = sample.spin_sample()
    print("spin_sample():", ss, type(ss))
except Exception as e:
    print("spin_sample() failed:", e)

# Check the metadata
print()
print("result.metadata:", result.metadata)
print("result.timing:", result.timing)
