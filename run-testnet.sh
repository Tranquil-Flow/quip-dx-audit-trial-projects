#!/usr/bin/env bash
# Runs the full prototype against Base Sepolia (chain 84532). Requires alice/bob EOAs in ./keys to hold
# a little Base Sepolia ETH (~0.002 each is plenty; gas is ~0.006 gwei). Override RPC with RPC_URL=...
set -euo pipefail
cd "$(dirname "$0")"
unset WALLET_TAG
export RPC_URL="${RPC_URL:-https://sepolia.base.org}" STEP_SECONDS="${STEP_SECONDS:-60}"
node scripts/check-funding.mjs
node scripts/setup-wallets.mjs | tee evidence/setup-wallets.log
[ -f keys/token.json ] || node scripts/deploy-token.mjs | tee evidence/deploy-token.log
node scripts/swap-happy.mjs  2>&1 | tee evidence/happy.log
node scripts/swap-refund.mjs 2>&1 | tee evidence/refund.log
