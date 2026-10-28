#!/usr/bin/env python3.13
"""
Max-Cut on Quip Network Aglais testnet using for_network().
"""

import os
from xqvm_py import XQMX
from xqsa import SolverDWaveCPU, SolverQuip

# Build the same max-cut problem
edges = [
    (0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0),
    (0, 3), (1, 4),
]
num_nodes = 6

model = XQMX.binary_model(size=num_nodes)
for (i, j) in edges:
    model.set_linear(i, model.get_linear(i) - 1)
    model.set_linear(j, model.get_linear(j) - 1)
    model.set_quadratic(i, j, model.get_quadratic(i, j) + 2)

print("Model built: {} variables, {} edges".format(num_nodes, len(edges)))

# --- Local solve ---
print("\n--- LOCAL CPU SOLVER ---")
local = SolverDWaveCPU().solve(model)
local_assign = [0] * num_nodes
for idx, val in local.sample.iter_linear():
    local_assign[idx] = val
cut = [(i,j) for (i,j) in edges if local_assign[i] != local_assign[j]]
print(f"Assignment: {local_assign}")
print(f"Energy:     {local.energy}")
print(f"Cut:        {len(cut)}/{len(edges)} edges")
print(f"Cut edges:  {cut}")

# --- Network solve via for_network ---
print("\n--- QUIP NETWORK (Aglais testnet) ---")
seed_hex = open("keys/throwaway_seed.txt").read().strip()

try:
    solver = SolverQuip.for_network(
        "aglais",
        seed=seed_hex,
        timeout=60,
        autofund=True,
    )
    print("Connected to Aglais via for_network()")
    
    # Try to get account balance
    try:
        balance = solver._iface.query("System", "Account", params=[solver._account_id])
        print(f"Account balance: {balance}")
    except Exception as e:
        print(f"Balance check: {e}")
    
    print("Submitting job...")
    net_result = solver.solve(model)
    
    net_assign = [0] * num_nodes
    for idx, val in net_result.sample.iter_linear():
        net_assign[idx] = val
    net_cut = [(i,j) for (i,j) in edges if net_assign[i] != net_assign[j]]
    
    print(f"Assignment: {net_assign}")
    print(f"Energy:     {net_result.energy}")
    print(f"Cut:        {len(net_cut)}/{len(edges)} edges")
    print(f"Cut edges:  {net_cut}")
    print(f"Metadata:   {net_result.metadata}")
    print(f"Timing:     {net_result.timing}")
    
except Exception as e:
    print(f"Failed: {type(e).__name__}: {str(e)[:600]}")
    
    # If autofund didn't work, try manual faucet
    if "balance" in str(e).lower() or "fund" in str(e).lower():
        print("\nTrying manual faucet request...")
        import requests
        for endpoint in [
            "https://faucet.aglais.quip.network/api/faucet/drip",
            "https://faucet.aglais.quip.network/api/faucet",
            "https://faucet.aglais.quip.network/drip",
            "https://faucet.aglais.quip.network/faucet",
        ]:
            try:
                resp = requests.post(endpoint, json={"address": "0x32d19aad762e497ecbea3b88ea61fafb8734541688f6d555ad1ebb34f54b8457"}, timeout=10)
                print(f"  {endpoint}: {resp.status_code} {resp.text[:200]}")
            except Exception as fe:
                print(f"  {endpoint}: {type(fe).__name__}: {str(fe)[:100]}")
