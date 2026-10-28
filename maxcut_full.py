#!/usr/bin/env python3.13
"""
Max-Cut problem on Quip Network's Aglais testnet.

Step 1: Create a throwaway keypair
Step 2: Fund it from the faucet
Step 3: Submit the max-cut problem via SolverQuip
Step 4: Also solve locally for comparison
"""

import os
import json
import time

# ============================================================
# PART 1: Create throwaway keypair
# ============================================================
print("=" * 60)
print("PART 1: Creating throwaway keypair")
print("=" * 60)

# Use the quip_signer to generate a keypair
try:
    import quip_signer
    print("quip_signer available:", dir(quip_signer))
except ImportError:
    print("quip_signer not available")

# Try to create a keystore using the substrate interface
from substrateinterface import SubstrateInterface

# Generate a new seed
import secrets
seed_hex = secrets.token_hex(32)
print(f"Generated seed (hex): {seed_hex}")

# Save the seed
os.makedirs("keys", exist_ok=True)
with open("keys/throwaway_seed.txt", "w") as f:
    f.write(seed_hex)
print("Seed saved to keys/throwaway_seed.txt")

# ============================================================
# PART 2: Connect to Aglais testnet and get account info
# ============================================================
print()
print("=" * 60)
print("PART 2: Connecting to Aglais testnet")
print("=" * 60)

RPC_URL = "wss://bootnode-1.aglais.quip.network:20049/rpc"
FAUCET_URL = "https://faucet.aglais.quip.network"

# First, let's try connecting and checking chain state
try:
    # Use the xqsa quip_metadata helper to connect properly
    from xqsa import quip_metadata
    iface = quip_metadata.connect(RPC_URL)
    iface.init_runtime()
    print("Connected to Aglais testnet via quip_metadata")
    print("Runtime version:", iface.runtime_version)
except Exception as e:
    print(f"quip_metadata connection failed: {type(e).__name__}: {str(e)[:300]}")
    # Fall back to direct substrateinterface
    try:
        iface = SubstrateInterface(url=RPC_URL)
        print("Connected via SubstrateInterface directly")
        print("Chain:", iface.chain)
    except Exception as e2:
        print(f"SubstrateInterface also failed: {type(e2).__name__}: {str(e2)[:300]}")

# ============================================================
# PART 3: Build and solve the max-cut problem locally
# ============================================================
print()
print("=" * 60)
print("PART 3: Building max-cut problem (6 nodes, 8 edges)")
print("=" * 60)

from xqvm_py import XQMX
from xqsa import SolverDWaveCPU

# Small graph: 6 nodes, 8 edges
edges = [
    (0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0),
    (0, 3), (1, 4),
]
num_nodes = 6

# Binary model for max-cut
model = XQMX.binary_model(size=num_nodes)

for (i, j) in edges:
    model.set_linear(i, model.get_linear(i) - 1)
    model.set_linear(j, model.get_linear(j) - 1)
    model.set_quadratic(i, j, model.get_quadratic(i, j) + 2)

print(f"Model: {num_nodes} variables, {len(edges)} edges")

# Solve locally
solver = SolverDWaveCPU()
local_result = solver.solve(model)

# Extract the assignment
assignment = [0] * num_nodes
for idx, val in local_result.sample.iter_linear():
    assignment[idx] = val

print()
print("=== LOCAL CPU SOLVER RESULT ===")
print(f"Binary assignment: {assignment}")
print(f"Energy: {local_result.energy}")

partition_A = [i for i, v in enumerate(assignment) if v == 0]
partition_B = [i for i, v in enumerate(assignment) if v == 1]
print(f"Partition A (x=0): {partition_A}")
print(f"Partition B (x=1): {partition_B}")

cut_edges = [(i,j) for (i,j) in edges if assignment[i] != assignment[j]]
print(f"Cut edges: {cut_edges}")
print(f"Cut size: {len(cut_edges)} / {len(edges)} edges")

# ============================================================
# PART 4: Try SolverQuip on testnet
# ============================================================
print()
print("=" * 60)
print("PART 4: Attempting Quip Network (Aglais testnet)")
print("=" * 60)

try:
    from xqsa import SolverQuip
    
    # Try connecting with the seed
    solver_quip = SolverQuip(
        url=RPC_URL,
        seed=seed_hex,
        timeout=30,  # Short timeout for testing
    )
    print("SolverQuip connected successfully!")
    print("Attempting to solve on network...")
    
    net_result = solver_quip.solve(model)
    print(f"Network result: energy={net_result.energy}")
    net_assignment = [0] * num_nodes
    for idx, val in net_result.sample.iter_linear():
        net_assignment[idx] = val
    print(f"Network assignment: {net_assignment}")
    
except Exception as e:
    print(f"SolverQuip failed: {type(e).__name__}: {str(e)[:500]}")
    
    # Try to understand the error better
    if "fund" in str(e).lower() or "balance" in str(e).lower():
        print("\n>>> Account needs funding. Trying faucet...")
        try:
            import requests
            # Try the faucet API
            resp = requests.post(FAUCET_URL, json={"address": "check_api"}, timeout=10)
            print(f"Faucet response: {resp.status_code} {resp.text[:300]}")
        except Exception as fe:
            print(f"Faucet check failed: {fe}")

print()
print("=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"Local solver: energy={local_result.energy}, cut={len(cut_edges)}/{len(edges)}")
print(f"Testnet status: see above")
