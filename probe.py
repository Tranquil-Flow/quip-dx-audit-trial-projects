import os
from xqsa import SolverQuip
s = SolverQuip.for_network("aglais", keystore=os.path.abspath("keys/keystore.json"), autofund=True)
print(s)
for a in dir(s):
    if not a.startswith('__'): print(a)
