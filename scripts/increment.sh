#!/usr/bin/env bash
# Increment the deployed Counter and read the value back.
#
#   ./scripts/increment.sh
#
# Optionally: ./scripts/increment.sh --by 5   (uses incrementBy(uint256))
#             ./scripts/increment.sh --read-only
set -euo pipefail
. "$(dirname "$0")/env.sh"

BY=1
READ_ONLY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --by) BY="$2"; shift 2 ;;
    --read-only) READ_ONLY=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

require_key
require_contract

BEFORE="$(cast call --rpc-url "$RPC_URL" "$CONTRACT" "count()(uint256)")"
echo "Contract : $CONTRACT"
echo "count()  : $BEFORE"

if [[ "$READ_ONLY" == "1" ]]; then
  exit 0
fi

if [[ "$BY" == "1" ]]; then
  SIG="increment()"
else
  SIG="incrementBy(uint256)"
fi

echo "==> Sending $SIG"
if [[ "$BY" == "1" ]]; then
  TXHASH="$(cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_PK" \
    --legacy --gas-price "$GAS_PRICE" --gas-limit "$CALL_GAS_LIMIT" \
    --async "$CONTRACT" "$SIG" | tail -1)"
else
  TXHASH="$(cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_PK" \
    --legacy --gas-price "$GAS_PRICE" --gas-limit "$CALL_GAS_LIMIT" \
    --async "$CONTRACT" "$SIG" "$BY" | tail -1)"
fi
echo "    tx: $TXHASH"

echo "==> Waiting for receipt"
RECEIPT=""
for _ in $(seq 1 30); do
  RECEIPT="$(cast receipt --rpc-url "$RPC_URL" "$TXHASH" --json 2>/dev/null || true)"
  [[ -n "$RECEIPT" ]] && break
  sleep 5
done

if [[ -z "$RECEIPT" ]]; then
  echo "ERROR: no receipt after 150s for $TXHASH" >&2
  exit 1
fi

STATUS="$(python3 -c "import json,sys;print(json.loads(sys.argv[1]).get('status'))" "$RECEIPT")"
GASUSED="$(python3 -c "import json,sys;print(int(json.loads(sys.argv[1])['gasUsed'],16))" "$RECEIPT")"
echo "    status=$STATUS gasUsed=$GASUSED"

AFTER="$(cast call --rpc-url "$RPC_URL" "$CONTRACT" "count()(uint256)")"
echo "==> count() read back: $AFTER"
echo
echo "explorer: $EXPLORER_URL/tx/$TXHASH"

if [[ "$STATUS" != "0x1" ]]; then
  echo "WARNING: tx status is NOT success" >&2
  exit 1
fi
if [[ "$AFTER" != "$((BEFORE + BY))" ]]; then
  echo "WARNING: expected $((BEFORE + BY)), read $AFTER" >&2
  exit 1
fi
echo "OK: $BEFORE -> $AFTER"
