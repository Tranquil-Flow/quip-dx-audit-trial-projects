#!/bin/bash
# Fund the devnet fee payer via the Ellipsis Labs proof-of-work faucet.
# Requires: cargo install devnet-pow
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
KEY=${1:-keys/payer.json}
TARGET_LAMPORTS=${2:-1500000000}
cd "$(dirname "$0")"
devnet-pow mine --target-lamports "$TARGET_LAMPORTS" -k "$KEY" -ud
solana balance -k "$KEY" -ud
