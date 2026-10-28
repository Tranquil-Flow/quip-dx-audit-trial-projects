#!/usr/bin/env bash
# Shared config for the Quip Network (Aglais testnet) Counter project.
# Source this from the other scripts: . "$(dirname "$0")/env.sh"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---- Network (Aglais = Quip Network testnet) -------------------------------
# Source of truth: https://aglais.quip.network
export RPC_URL="${RPC_URL:-https://evm-rpc.aglais.quip.network:20049}"
export CHAIN_ID=20033            # 0x4e41
export NETWORK_NAME="Aglais Testnet (Quip Network)"
export EXPLORER_URL="https://explorer.aglais.quip.network"
export FAUCET_URL="https://faucet.aglais.quip.network/request"
export FAUCET_AMOUNT_AGLS=10

# ---- Keys (throwaway, testnet only) ---------------------------------------
export KEY_FILE="${KEY_FILE:-$PROJECT_DIR/keys/deployer.json}"
export DEPLOYMENTS_FILE="$PROJECT_DIR/deployments/aglais.json"

# ---- Gas -------------------------------------------------------------------
# !! IMPORTANT, NON-OBVIOUS !!
# pallet-revive charges a storage deposit for contract code, and its eth-rpc
# converts that deposit into GAS. For this tiny Counter that is ~733,000,000 gas.
# Tools that estimate by simulation (forge create, ethers, hardhat defaults)
# under-estimate badly and the tx fails with confusing errors:
#   - no `value` attached -> "StorageDepositNotEnoughFunds"
#   - a `value` attached  -> "OutOfGas" / "execution reverted"
# The working recipe is: value = 0 and a gas limit >= ~750M.
export DEPLOY_GAS_LIMIT=900000000

# First increment() writes a fresh storage slot and needs a big gas limit too
# (~4.7M observed); later ones are ~2.0M. 30M is a comfortable ceiling.
export CALL_GAS_LIMIT=30000000

# The chain pins the gas price at 1 gwei and it is effectively fixed.
export GAS_PRICE=1gwei

require_key() {
  if [[ ! -f "$KEY_FILE" ]]; then
    echo "ERROR: no key at $KEY_FILE" >&2
    echo "Create one (throwaway, testnet only) with:" >&2
    echo "  mkdir -p keys && chmod 700 keys" >&2
    echo "  cast wallet new --json > /tmp/k.json && python3 -c \"import json;d=json.load(open('/tmp/k.json'))[0];open('$KEY_FILE','w').write(json.dumps(d,indent=2))\"" >&2
    exit 1
  fi
  DEPLOYER_PK="$(python3 -c "import json,sys;print(json.load(open('$KEY_FILE'))['private_key'])")"
  DEPLOYER_ADDRESS="$(cast wallet address --private-key "$DEPLOYER_PK")"
  export DEPLOYER_PK DEPLOYER_ADDRESS
}

# Load a previously deployed contract address.
require_contract() {
  if [[ -n "${CONTRACT:-}" ]]; then return 0; fi
  if [[ -f "$DEPLOYMENTS_FILE" ]]; then
    CONTRACT="$(python3 -c "import json;print(json.load(open('$DEPLOYMENTS_FILE'))['address'])")"
    export CONTRACT
  else
    echo "ERROR: no deployment found at $DEPLOYMENTS_FILE. Run scripts/deploy.sh first." >&2
    exit 1
  fi
}
