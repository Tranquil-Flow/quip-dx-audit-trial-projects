#!/usr/bin/env bash
# Reproduce the on-chain SHRINCS verification checks against the contracts
# deployed on Aglais (chain 20033) during this demo. Read-only (eth_call).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export PATH="$PWD/.foundry/bin:$PATH"
RPC=https://evm-rpc.aglais.quip.network:20049

VER_V4=0x7C4eF58b16E0677931473A31ccC2fdd0c615aa3C      # SHRINCS256sKeccak (v4 format)
SPV_V4=0xf7a8394824Dc3193BcAd5868a7c9Be29B204d80f     # SPHINCSPlusC256sKeccak (v4)
VAULT=0x11F1084FceD758F4567DE5DD105035bCB9DAbb6f       # PqUnlock demo consumer
EXAMPLE=0xb8C6656FA26D2F16E6e6Fb2db7EAb504212B1700     # Quip's SHRINCSERC7913ConsumerExample

COMMIT=$(python3 -c "import json;print(json.load(open('keys/shrincs-demo.json'))['publicKeyCommitment'])")
MSG=$(python3 -c "import json;print(json.load(open('keys/shrincs-demo.json'))['message'])")
SIG=$(python3 -c "import json;print(json.load(open('keys/shrincs-demo.json'))['stateful']['signature'])")
STATELESS=$(python3 -c "import json;d=json.load(open('keys/shrincs-demo.json'))['stateless'];print(d['pkSeed']+d['root'],d['signature'],sep=' ')")
set -- $STATELESS
STATELESS_KEY=0x$1
STATELESS_SIG=0x$2

echo "== SHRINCS256sKeccak (v4) stateful verify, valid =="
cast call $VER_V4 "verify(bytes,bytes32,bytes)(bytes4)" 0x$COMMIT 0x$MSG 0x$SIG --rpc-url $RPC

echo "== SPHINCSPlusC256sKeccak stateless verify, valid =="
cast call $SPV_V4 "verify(bytes,bytes32,bytes)(bytes4)" $STATELESS_KEY 0x$MSG $STATELESS_SIG --rpc-url $RPC

echo "== PqUnlock.isAuthorized (view gate) =="
cast call $VAULT "isAuthorized(bytes32,bytes)(bool)" 0x$MSG 0x$SIG --rpc-url $RPC

echo "== PqUnlock state =="
cast call $VAULT "unlocked()(bool)" --rpc-url $RPC
cast call $VAULT "lastVerifiedHash()(bytes32)" --rpc-url $RPC
cast call $VAULT "unlockCount()(uint256)" --rpc-url $RPC

echo "== Quip example consumer isAuthorized =="
cast call $EXAMPLE "isAuthorized(bytes32,bytes)(bool)" 0x$MSG 0x$SIG --rpc-url $RPC

echo "== VERSION_TAGs =="
cast call $VER_V4 "VERSION_TAG()(bytes32)" --rpc-url $RPC
cast call $VER_V4 "PROFILE_TAG()(bytes32)" --rpc-url $RPC

echo "Done. Expect: 0x024ad318 / 0x024ad318 / true / true / 0x728df4be... / 1 / true /"
echo "0xb84d51f9... (v4) / 0x32f573b4... (256s-keccak profile)"
