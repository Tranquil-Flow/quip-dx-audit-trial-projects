from xqsa import SolverQuip
s = SolverQuip(url="wss://bootnode-1.aglais.quip.network:20049/rpc", keystore="keys/testnet.json")
print("constructed ok")
print("public attrs:", [a for a in dir(s) if not a.startswith('_')])
