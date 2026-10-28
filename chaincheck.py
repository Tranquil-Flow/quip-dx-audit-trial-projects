from substrateinterface import SubstrateInterface
si = SubstrateInterface(url="wss://bootnode-1.aglais.quip.network:20049/rpc")
print("chain:", si.chain, "| token:", si.token_symbol, "| ss58:", si.ss58_format)
acct = bytes.fromhex("26c6f573f4f58d8567a5b4a6193915aae5f6a972e75d5eaf36ad001238d0a696")
try:
    a = si.query("System","Account",[acct])
    print("balance:", a.value)
except Exception as e:
    print("acct err:", e)
# look for order storage
for pallet in ("QuantumPow","Quip","Compute","Solver"):
    try:
        m = si.get_metadata_module(pallet)
        print(pallet, "->", [f.name for f in m.calls] if m else None)
    except Exception as e:
        print(pallet, "no module")
