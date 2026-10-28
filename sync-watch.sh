#!/usr/bin/env bash
# emits one line per minute: my best block vs public head; exits when synced
while true; do
  h=$(./rpc.sh system_health); c=$(./rpc.sh chain_getHeader | grep -o '"number":"0x[0-9a-f]*"' | cut -d'"' -f4)
  p=$(curl -s -m 10 -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"chain_getHeader","params":[]}' https://bootnode-1.aglais.quip.network:20049/rpc | grep -o '"number":"0x[0-9a-f]*"' | cut -d'"' -f4)
  echo "$(date +%H:%M:%S) mine=$((c)) public=$((p)) health=$h"
  echo "$h" | grep -q '"isSyncing":false' && { echo SYNCED; exit 0; }
  sleep 60
done
