# Ops runbook — Quip Aglais testnet node + CPU miner (Docker, this Mac)

Stack lives in `./repo` (clone of `gitlab.com/quip.network/nodes.quip.network`) with local
overrides. Compose project **`t05cs`**; containers `t05cs-validator`, `t05cs-miner`,
`t05cs-dashboard`. Nothing here touches other stacks on the host (`quip-validator`,
`quip-dashboard`, etc. belong to someone else — never `down`/`prune`/`rm` them).

| What | Value |
|---|---|
| p2p (libp2p) | host `30334` tcp+udp -> container 30333 (default 30333 is taken by another node) |
| Front door (Caddy: dashboard, `/rpc`, `/api/v1`) | http://127.0.0.1:20059 (no TLS; 80/443 not published) |
| Log collector | udp 127.0.0.1:5524 |
| Miner key (throwaway, testnet only) | `./keys/keystore.json` (0600) — back up if you care about the account |
| Miner account | `5HNDzkwrGUbcXu2n46dUrYVkEFx462Kt43Q3iwMzVQRe4xii` |
| Chain data | `repo/data/aglais-chain-db` (archive node, several GB) |
| Named volumes (mine) | `t05cs-caddy-data`, `t05cs-caddy-config`, `t05cs-dashboard-data` |

Every command below is run from `./repo`:

```bash
cd /private/tmp/devtrials3/t05-claude-sonnet/repo
```
`.env` sets `COMPOSE_PROJECT_NAME=t05cs`, and `docker-compose.override.yml` is auto-loaded, so plain
`docker compose --profile cpu ...` only ever addresses this project. **The `--profile cpu` flag is
mandatory** — without it compose sees no services.

## Start
```bash
docker compose --profile cpu up -d quip-validator dashboard   # node + dashboard/log collector
docker compose --profile cpu up -d cpu                        # miner (waits for validator health)
# or all at once:  docker compose --profile cpu up -d
```
- Restart of an already-synced node is quick (measured: validator healthy in ~15 s, miner mining again within ~20 s; same account, no re-funding). A **fresh** data dir must
  re-sync from genesis: ~30 min on this machine (450 → 150 blocks/s). `up -d` on everything blocks
  until the validator is healthy (compose `depends_on: service_healthy`, up to 24h grace) — so do the
  two-step form above on a fresh install.
- Miner needs the validator healthy; it self-funds from the Aglais faucet if its balance < 2 AGLS.

## Verify (synced + mining)
```bash
docker compose --profile cpu ps                               # all "healthy"/Up
../rpc.sh system_health                                       # {"isSyncing":false,"peers":N>0}
../rpc.sh chain_getHeader | grep -o '"number":"0x[0-9a-f]*"'  # compare with the public head:
curl -s -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"chain_getHeader","params":[]}' \
  https://bootnode-1.aglais.quip.network:20049/rpc | grep -o '"number":"0x[0-9a-f]*"'
curl -s http://127.0.0.1:20059/api/v1/status                  # is_mining:true, miner_registered:true, proofs_*
curl -s http://127.0.0.1:20059/api/v1/stats                   # results_received, submission_errors
docker logs --tail 20 t05cs-miner | grep -E 'progress|new round|coordinator alive'
```
(`../rpc.sh <method> [params]` is a tiny curl JSON-RPC helper against `127.0.0.1:20059/rpc`.)

## Logs
```bash
docker compose --profile cpu logs -f quip-validator     # sync / import / peers
docker compose --profile cpu logs -f cpu                # miner: attempts, rounds, submissions
docker compose --profile cpu logs -f dashboard          # caddy / collector startup errors
tail -F data/logs/quip-node.log                         # merged, best-effort (UDP), rotates 10MB x5
```
Per-service `docker logs` is the record of truth; the merged file can drop lines.

## Stop (keeps chain DB, keys, volumes)
```bash
docker compose --profile cpu stop        # stops all three; containers/volumes/data stay
# full teardown of containers only (still keeps data + named volumes):
docker compose --profile cpu down
```
**Never** add `-v`, and never run `docker system/volume prune` on this host (other operators' volumes).
Only the `t05cs-*` containers are ours; `stop` leaves them stopped (`restart: unless-stopped` honours a manual stop).
The miner reports exit code 137 on `stop` (killed, not a clean exit) — harmless in testing.

## Upgrade
Images are on the moving `beta` channel with `pull_policy: always`. Pin with `QUIP_MINER_TAG` /
`QUIP_VALIDATOR_TAG` / `QUIP_DASHBOARD_TAG` in `.env` if you want reproducibility (a stale pin wins over
`CHANNEL` — remove rather than bump).
```bash
docker compose --profile cpu pull
docker compose --profile cpu up -d quip-validator dashboard   # recreates only containers whose image changed
docker compose --profile cpu up -d cpu
docker compose --profile cpu ps && docker logs --tail 30 t05cs-miner
```
Deployment repo upgrade: `git fetch && git diff HEAD origin/main -- docker-compose.yml env.example config/quip-miner.toml`
first. I edited the tracked `config/quip-miner.toml` (public_host/port, signer_key, node_name), so
`git pull` may conflict: `git stash && git pull && git stash pop`. Changes to `data/config.toml` need
`docker compose --profile cpu restart cpu` (read once at start; the file is seeded from the template
only on first run, so template edits after that have no effect). Changes to `.env` /
override need `up -d --force-recreate <service>`.
The hourly `cron.sh --install` auto-updater from the upstream README is **not** installed.

## Gotchas found while building this
- `.env` must NOT contain `PGID=20` (macOS `id -g`): the image's entrypoint crash-loops with
  `groupmod: GID '20' already exists`. Leave PUID/PGID unset.
- Dashboard `/data` must be a named volume on macOS (bind mount -> `chown ... Invalid argument`).
- Miner keystore path is taken from env `QUIP_SIGNER_KEY` (set in the override), not from config `signer_key`.
- Inbound p2p on 30334 and the front door on 20059 are only reachable from the LAN/Internet if the
  router forwards them; the node syncs and mines fine without (outbound only) but has fewer peers.
- Miner limits: `cpuset 0-1`, `mem_limit 4g` (Docker VM has 8 GB shared with other stacks).
