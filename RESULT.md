# RESULT

Status: PARTIAL

Quip's live Aglais testnet node ran on this Apple Silicon Mac via official Docker deployment (isolated override). It connected to peers and advanced from genesis to block #34479 toward #376728, but remained in initial archive sync. A separate CPU miner generated a fresh hybrid signing key, connected to the documented public Aglais RPC, received testnet faucet funds, registered on-chain, spawned `quip-cpu-sa`, and staged mining work. No completed solver result or proof submission was observed. Do not interpret this as confirmed earnings or successful block production.

Files: `deployment/` is a shallow clone of the official compose repository at 14d9979. `deployment/trial.yml` isolates container names, ports and volumes. `keys/keystore.json` is the freshly generated miner secret; `keys/aglais-chain-db/chains/quip_testnet/network/secret_ed25519` is the freshly generated node identity. The partial chain database is also under `keys/aglais-chain-db/` so all testnet keys remain within `./keys`. Treat that directory as secret; do not publish it. No prior wallet or mainnet key was used.

To run again from this directory:

```sh
cd deployment
docker compose -p h4trial -f docker-compose.yml -f trial.yml --profile cpu up -d --no-deps dashboard quip-validator
# Local validator syncs for hours. Miner currently points at public bootnodes instead:
docker compose -p h4trial -f docker-compose.yml -f trial.yml --profile cpu up -d --no-deps cpu
docker logs -f h4trial-quip-validator
docker logs -f h4trial-quip-cpu
curl -sS http://127.0.0.1:12049/api/v1/stats
```

To use the local node once fully synced, change `[miner].validators` in `keys/config.toml` back to `["ws://quip-validator:9944"]` and restart the miner. The default full-stack `up -d` waits for validator health, potentially hours. Observe disk growth: this is an archive node and can eventually exceed 15 GB; stop it before that threshold. For cleanup of this isolated trial only: `docker compose -p h4trial -f docker-compose.yml -f trial.yml --profile cpu down --volumes` (verify the project name and names before executing). If Docker's API returns 500, remove only exact `h4trial-*` container/volume/network names, not shared resources.

Evidence:
- Aglais chain-spec SHA-256 verification: `aglais-network.json: OK`; validator log: `Chain specification: AGLS (Quip Testnet)`, genesis `0x59e0…c286`, 7 peers and `system_health` returned `isSyncing:true`. On resumed state, same node peer ID `12D3KooWFTMhLPSPVzfeuGNZApV8SgbDEtRZLtfYskjdtaWSsKUG`; best #34479, target #376728.
- Miner log: `miner account is now funded balance=10000000000000`, `registered this account as a miner on chain`, `miner spawned miner=cpu-0 binary=quip-cpu-sa`, `feeder: mining snapshot available`, new round qblock_id=8055. Faucet transaction hash and miner account address were not exposed by logs; keystore has only a seed, not a public address. Do not use the unrelated `signer=0x3f73…` from a pending proof log as this miner's account.
- `/api/v1/stats`: `contexts_dispatched:12`, `results_received:0`, `proofs_submitted:0`; throughput log `staged=256`, `jobs_completed_total=0`. No tx hash or proof ID to report.
- Final project disk: ~504 MB, below 15 GB. All `h4trial-*` containers and named volumes were removed. Pre-existing Docker containers were not stopped or deleted. Existing Docker images were not removed.

What did not work: initial Mac GID 20 collided inside the images (fixed with 1000:1000); dashboard's macOS bind-mounted Unix socket failed ownership change (fixed with trial named volume); default config.cpu.toml was obsolete; initial sync did not finish; remote RPC intermittently timed out or replied HTTP 429; miner did not complete or submit a solution within this trial. The initial compose cleanup returned Docker API 500; exact-name cleanup succeeded. A nested file mount for the network key failed in Docker Desktop; mounting the whole chain state under ./keys succeeded and was tested on restart.

Top 5 vendor documentation/site improvements:
1. Fix the quickstart's browser redirect to dead GitBook (`Content owner not found`) and keep canonical docs consistently reachable.
2. Replace the obsolete `data/config.cpu.toml` copy step with a valid v0.3 `[miner]` template; test a fresh checkout end to end.
3. Publish a macOS/Docker Desktop recipe for UID/GID, dashboard socket data volume, CPU/Metal selection, isolated ports and keys.
4. Document expected archive sync size/time, a disk-limited/pruned alternative (with dashboard tradeoff), and a safe remote-RPC miner-only mode.
5. Document miner account/address lookup, faucet tx IDs, progress API/metrics and how to distinguish staged work from completed/submitted proofs; explain public RPC rate limits.
