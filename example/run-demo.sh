#!/usr/bin/env bash
# End-to-end QVRF-pattern demo on the Quip Aglais testnet (chain 20033).
# Prereqs: foundry (forge/cast), a funded throwaway key in ../keys/wallet.key.
# Faucet: curl -X POST https://faucet.aglais.quip.network/request \
#           -H 'Content-Type: application/json' -d '{"dest": "<your address>"}'
set -euo pipefail
cd "$(dirname "$0")"

RPC=https://evm-rpc.aglais.quip.network
PK=$(cat ../keys/wallet.key)   # never printed
DISPENSER=${DISPENSER:-0x3E7aF8d69B90Dd4fCaE5aef303BF67c598460666}
LOOTDROP=${LOOTDROP:-0x6c13051F87e568A25a9a5e27a2e862bF2bE7213a}

echo "== 1. requestLoot() — ask the coordinator for quantum randomness"
cast send "$LOOTDROP" "requestLoot()" --rpc-url "$RPC" --private-key "$PK" --json \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print("tx:",d["transactionHash"],"status:",d["status"])'

echo "== 2. read pending request ids"
cast call "$LOOTDROP" "dropsOf(address)(uint256[])" \
  0xcf29AB2B6A5dfD3826e607FefE031248b473AfB0 --rpc-url "$RPC"

RID=$(cast call "$LOOTDROP" "dropsOf(address)(uint256[])" \
  0xcf29AB2B6A5dfD3826e607FefE031248b473AfB0 --rpc-url "$RPC" \
  | tr -d '[]' | tr ',' '\n' | tr -d ' ' | tail -1)
echo "using requestId=$RID"

echo "== 3. fulfill — coordinator delivers randomWords[] (mock here; real QVRF later)"
cast send "$DISPENSER" "fulfillAuto(uint256)" "$RID" --rpc-url "$RPC" --private-key "$PK" --json \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print("tx:",d["transactionHash"],"status:",d["status"])'

echo "== 4. read the rolled drop  (rarity: 0=Common 1=Uncommon 2=Rare 3=Epic 4=Legendary)"
cast call "$LOOTDROP" "getDrop(uint256)((uint256,address,uint8,uint256,bool,bool))" "$RID" --rpc-url "$RPC"

echo "== 5. LootRolled events"
cast logs --rpc-url "$RPC" --address "$LOOTDROP" --from-block 0x65e00 | head -25
