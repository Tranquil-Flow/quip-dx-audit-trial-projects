#!/usr/bin/env bash
# Deploy Counter.sol to the Quip Network (Aglais) EVM testnet.
#
#   ./scripts/deploy.sh
#
# Writes the contract address + tx hash to deployments/aglais.json.
set -euo pipefail
. "$(dirname "$0")/env.sh"

require_key
mkdir -p "$(dirname "$DEPLOYMENTS_FILE")"

echo "Network : $NETWORK_NAME  (chain id $CHAIN_ID)"
echo "RPC     : $RPC_URL"
echo "Deployer: $DEPLOYER_ADDRESS"
echo

BALANCE="$(cast balance --rpc-url "$RPC_URL" "$DEPLOYER_ADDRESS")"
echo "Balance : $BALANCE wei"
if [[ "$BALANCE" == "0" ]]; then
  echo "No funds. Get testnet AGLS first (10 per request):"
  echo "  curl -X POST $FAUCET_URL -H 'content-type: application/json' -d '{\"dest\":\"$DEPLOYER_ADDRESS\"}'"
  exit 1
fi

echo "==> Compiling"
forge build --root "$PROJECT_DIR"
BYTECODE="$(forge inspect --root "$PROJECT_DIR" src/Counter.sol:Counter bytecode)"
echo "    runtime creation bytecode: $((${#BYTECODE} / 2)) bytes"

# NOTE: value is deliberately 0 and the gas limit is deliberately huge.
# See the comment in scripts/env.sh for why.
echo "==> Sending deployment tx (gas limit $DEPLOY_GAS_LIMIT, value 0)"
TXHASH="$(cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_PK" \
  --legacy \
  --gas-price "$GAS_PRICE" \
  --gas-limit "$DEPLOY_GAS_LIMIT" \
  --async \
  --create "$BYTECODE" | tail -1)"

echo "    tx: $TXHASH"
echo "==> Waiting for receipt"

RECEIPT=""
for _ in $(seq 1 30); do
  RECEIPT="$(cast receipt --rpc-url "$RPC_URL" "$TXHASH" --json 2>/dev/null || true)"
  [[ -n "$RECEIPT" ]] && break
  sleep 5
done

if [[ -z "$RECEIPT" ]]; then
  echo "ERROR: no receipt after 150s. Check $EXPLORER_URL/tx/$TXHASH" >&2
  exit 1
fi

python3 - "$DEPLOYMENTS_FILE" "$TXHASH" "$RECEIPT" "$CHAIN_ID" "$NETWORK_NAME" "$RPC_URL" <<'PY'
import json, sys
out, txhash, receipt, chainid, name, rpc = sys.argv[1:7]
r = json.loads(receipt)
if r.get("status") != "0x1":
    print("ERROR: deployment tx FAILED (status %s)." % r.get("status"), file=sys.stderr)
    print("  gasUsed = %d" % int(r.get("gasUsed", "0x0"), 16), file=sys.stderr)
    print("  Most likely the gas limit is below the storage-deposit requirement.", file=sys.stderr)
    sys.exit(1)
data = {
    "network": name,
    "chainId": int(chainid),
    "rpcUrl": rpc,
    "contract": "Counter",
    "address": r["contractAddress"],
    "deployer": r["from"],
    "deployTxHash": txhash,
    "deployBlock": int(r["blockNumber"], 16),
    "deployGasUsed": int(r["gasUsed"], 16),
}
json.dump(data, open(out, "w"), indent=2)
print("==> DEPLOYED")
print("    address : %s" % data["address"])
print("    block   : %d" % data["deployBlock"])
print("    gasUsed : %d" % data["deployGasUsed"])
print("    explorer: https://explorer.aglais.quip.network/address/%s" % data["address"])
PY
