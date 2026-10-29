# RESULT
Status: WORKING (node synced + miner registered and doing mining work; node left STOPPED). Caveat: no proof submitted/won yet in the observed ~5 min.

## Run
`cd /home/dev1/projects/proj-15b5ec && docker compose up -d` ; stop `docker compose stop`. See RUNBOOK.md (start/stop/logs/upgrade) and DEVLOG.md.

## Evidence
- Network: Aglais testnet (runtime spec 118). Validator synced from genesis with 8-9 peers: "Idle (9 peers), best #488189"; system_health isSyncing=false.
- Miner account (public): 0x43dcfd25444250421fd37f41fed3b9e20af48d4c647b050856314c0ec41a76f9, registered at block 488246; faucet funded 10000000000000; "registered this account as a mempool solver".
- /api/v1/status: is_mining=true, miner_registered=true, head 488282 (matching chain). Miner process quip-cpu-sa ~200% CPU; coordinator rounds (qblock 9538, 9539), results_validated 10 -> 35; proofs_submitted=0.
- Containers: devnodea-validator, devnodea-miner; network devnodea-net; no volumes; data under ./data, key in ./keys/keystore.json. Host ports 127.0.0.1:31100/31101/31102 only.

## Not working / notes
- Vendor compose unusable here as-is (fixed names quip-*, ports 80/443/20049/30333); wrote own compose. Dashboard omitted.
- Inbound p2p 30333 and 20049 not exposed (rules); node is outbound-only peer.
- Leftover uid-1000-owned dir data/miner-failed-first-run (contains a failed first-run, unused keystore) could not be removed by me.
- Initial sync took ~17h wall time because the session was suspended; actual sync rate was ~500->125 blocks/s.

## Vendor doc improvements
- README says public_host removed, but coordinator requires [miner].public_host; entrypoint ignores signer_key and PUID for the miner; compose has hardcoded container names/ports and no easy "namespace" option; document keystore location and the uid-1000 behavior; gitbook run-a-node URL 404s.
