#!/bin/bash
# Poll the Solana devnet faucet until the payer actually has lamports (or N tries).
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
KEY=${1:-keys/payer-cli.json}
TRIES=${2:-20}
SLEEP=${3:-60}
cd "$(dirname "$0")/.."
for i in $(seq 1 "$TRIES"); do
  OUT=$(solana airdrop 1 -k "$KEY" -ud 2>&1)
  BAL=$(solana balance -k "$KEY" -ud 2>/dev/null | awk '{print $1}')
  if [ -n "$BAL" ] && [ "$BAL" != "0" ]; then
    echo "AIRDROP LANDED on attempt $i — balance: $BAL SOL"
    exit 0
  fi
  echo "[$i/$TRIES] $(date +%H:%M:%S) bal=$BAL err=$(echo "$OUT" | tail -1 | cut -c1-80)"
  sleep "$SLEEP"
done
echo "AIRDROP POLLER GAVE UP"
exit 1
