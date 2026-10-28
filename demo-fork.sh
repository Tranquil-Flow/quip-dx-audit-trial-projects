#!/usr/bin/env bash
# Full end-to-end run against an anvil FORK of Base Sepolia (real Quip contracts,
# fake ETH via anvil_setBalance because no usable Base Sepolia faucet was found).
set -euo pipefail
cd "$(dirname "$0")"
PORT=8546
anvil --fork-url https://sepolia.base.org --chain-id 84532 --port $PORT --silent &
ANVIL=$!; trap 'kill $ANVIL 2>/dev/null' EXIT
until cast chain-id --rpc-url http://127.0.0.1:$PORT >/dev/null 2>&1; do sleep 1; done
export QUIP_RPC=http://127.0.0.1:$PORT QUIP_NETWORK=base-sepolia
EOA=$(node -e 'console.log(JSON.parse(require("fs").readFileSync("keys/eoa.json")).address)')
echo "== fork of Base Sepolia at block $(cast block-number --rpc-url $QUIP_RPC); giving EOA $EOA 1 fork-ETH"
cast rpc anvil_setBalance $EOA 0xDE0B6B3A7640000 --rpc-url $QUIP_RPC >/dev/null
rm -f keys/wallet-state-base-sepolia.json
echo "== info";              node quip-wallet.mjs info
echo "== create";            node quip-wallet.mjs create
echo "== fund 0.01";         node quip-wallet.mjs fund 0.01
echo "== transfer 0.002 (from smart-account balance)"; node quip-wallet.mjs transfer 0x1111111111111111111111111111111111111111 0.002
echo "== transfer 0.001 --from-eoa (SDK default semantics)"; node quip-wallet.mjs transfer 0x000000000000000000000000000000000000dEaD 0.001 --from-eoa
echo "== status";            node quip-wallet.mjs status
echo "== negative test (tampered signed call)"; node neg-test.mjs
rm -f keys/wallet-state-base-sepolia.json   # fork-only state, not real chain
