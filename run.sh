#!/usr/bin/env bash
# Run the whole OTC desk prototype end to end.
#
#   ./run.sh            -> runs against a LOCAL FORK of Base Sepolia (default)
#   RPC_URL=<url> ./run.sh  -> runs against any node at that RPC (e.g. live Base Sepolia,
#                              which additionally needs funded EOAs)
#
# The fork is used because no Base Sepolia faucet could be reached without an
# account/API key, so a live-testnet run could not be funded. See RESULT.md.
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.foundry/bin:$PATH"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

if [ "$RPC_URL" = "http://127.0.0.1:8545" ]; then
  if ! curl -s -m 3 -X POST -H 'Content-Type: application/json' \
       --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' "$RPC_URL" >/dev/null 2>&1; then
    echo ">> starting anvil, forked from live Base Sepolia (chain 84532)..."
    anvil --fork-url https://sepolia.base.org --chain-id 84532 --port 8545 --auto-impersonate --silent &
    ANVIL_PID=$!
    trap 'kill $ANVIL_PID 2>/dev/null || true' EXIT
    sleep 10
  fi
fi

echo ">> building contracts"
forge build >/dev/null

echo ">> running prototype"
RPC_URL="$RPC_URL" node src/flow.mjs

echo
echo ">> evidence: ./evidence.json   signed orders: ./orders.json   keys: ./keys/"
