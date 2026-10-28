from xqvm_py import XQMX
m = XQMX.binary_model(size=4)
print("empty:", m)
m.set_linear(0, -1)
print("after linear:", m)
m.set_quadratic(0, 1, 2)
print("after set_quadratic(0,1,2):", m)
try:
    print("hasattr set_quadratic:", hasattr(m,'set_quadratic'))
    import inspect
    print(inspect.signature(m.set_quadratic))
except Exception as e:
    print("err", e)
