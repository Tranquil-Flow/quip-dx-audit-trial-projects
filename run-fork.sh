#!/usr/bin/env bash
# Same flow against a local anvil fork of Base Sepolia (real deployed QuipSwap + WalletFactory bytecode/state).
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p evidence
PORT=18545; export RPC_URL=http://127.0.0.1:$PORT WALLET_TAG=.fork STEP_SECONDS=60
anvil --fork-url https://sepolia.base.org --port $PORT --chain-id 84532 --no-storage-caching --silent & APID=$!
trap 'kill $APID' EXIT; sleep 5
rm -f keys/*.fork.json keys/*.fork.shrincs-seed.hex
for a in $(node -e 'for (const n of ["alice","bob"]) console.log(require("./keys/"+n+".json")[0].address)' 2>/dev/null || python3 -c 'import json;[print(json.load(open(f"keys/{n}.json"))[0]["address"]) for n in ("alice","bob")]'); do
  cast rpc anvil_setBalance "$a" 0x16345785D8A0000 --rpc-url $RPC_URL >/dev/null; done
node scripts/setup-wallets.mjs && node scripts/deploy-token.mjs
node scripts/swap-happy.mjs 2>&1 | tee evidence/happy.fork.log
node scripts/swap-refund.mjs 2>&1 | tee evidence/refund.fork.log
