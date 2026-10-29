# Ops runbook: Quip Aglais testnet node + CPU miner (devnodea-quip)
Dir: /home/dev1/projects/proj-15b5ec. Compose project `devnodea-quip`, containers `devnodea-validator`, `devnodea-miner`, network `devnodea-net`. Host ports (127.0.0.1 only): 31100 RPC, 31101 miner REST, 31102 p2p.
- Start: `docker compose up -d` (validator first; miner waits for healthy/synced validator). Restarting after a long stop re-syncs the gap (fast once near head).
- Stop: `docker compose stop` (restart policy is "no", so it stays down).
- Status: `curl -s -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"system_health","params":[]}' 127.0.0.1:31100` (want isSyncing=false, peers>0); `curl -s 127.0.0.1:31101/api/v1/status` (is_mining, miner_registered).
- Logs: `docker logs -f devnodea-validator`, `docker logs -f devnodea-miner` (look for "coordinator alive ... results_validated").
- Upgrade: `git -C repo pull` (check CHANGELOG/chain-specs for a new genesis; if so use a new ./data/chain dir), then `docker compose pull && docker compose up -d`. Images are on the `beta` tag; `stable` is the alternative. Compare repo/docker-compose.yml to ours for new flags.
- Keys: ./keys/keystore.json (throwaway testnet key, mounted into the miner). Back up; never commit. Miner re-funds from the faucet only if balance is low.
- Caveats: miner container runs as uid 1000 regardless of PUID, so ./data/m is uid-1000 owned. p2p inbound (30333) and 20049 are NOT exposed (firewall untouched); the node only dials out.
