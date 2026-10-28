# DEVLOG — Quip Network testnet node + miner

> NOTE (correction): clock times written in section headers below as (12:20)/(12:27)/(12:31)/(12:35) were my rough estimates, not real timestamps; real wall-clock (CEST) is from `date` and log lines: session start 12:09, validator first started ~12:11, sync watcher lines are real.

Started 2026-09-28 ~12:09 CEST. Host: macOS (Apple Silicon), Docker 29.1.3 arm64, Compose v2.40.3.

## Pre-flight (12:09)
- `docker ps`: pre-existing container `quip-validator` (image registry.gitlab.com/quip.network/quip-validator/quip-network-node:v0.3.1) already binds 127.0.0.1:9944 and 0.0.0.0:30333 (tcp+udp). NOT MINE — must not touch. Also `buildx_buildkit_t2builder0`.
- Pre-existing networks not mine: aglais-mine_default, cs05quip_default, dev-quip_default, quip-dev_default, quip_default, t05quip_default. Volumes not mine: many anonymous + quip_caddy-*, quip-review-j05-caddy-*.
- Decision: use unique compose project name + container names (prefix `t05cs-`), and non-default host ports. Never use `docker compose down -v`/prune, only my own project name.

## Sources consulted (in order)
1. WebSearch "Quip Network testnet run a node and miner docs" -> found gitbook, GitHub mirror, GitLab.
2. WebFetch https://quip.gitbook.io/docs/nodes/run-a-node-testnet -> **HTTP 404** (URL returned by search results is dead/not fetchable through my tool). Dead end #1.
3. WebFetch https://github.com/QuipNetwork/nodes.quip.network -> README summary: compose stack (validator+miner+dashboard), `docker compose --profile cpu up -d`, ports 20049/tcp, 30333 tcp+udp, network "Aglais" testnet, genesis 0x59e064bd...c286, canonical repo on GitLab.
4. WebFetch https://quip.gitbook.io/docs/getting-started/quickstart -> **HTTP 404** too. Dead end #2. Gitbook docs unreachable via my fetch tool; relied on the repo instead.
5. `git clone https://gitlab.com/quip.network/nodes.quip.network.git repo` (official deployment repo; HEAD 14d9979 "Merge branch 'feat/embedded-dashboard-services'"). Read README.md, docker-compose.yml, env.example, Makefile, config/quip-miner.toml, scripts/validator-healthcheck.sh. (Reading source/config instead of the gitbook docs.)
6. `curl https://bootnode-1.aglais.quip.network:20049/rpc` (public RPC listed in README) system_health => peers=40, isSyncing=false; chain_getHeader => head 0x5ba82 = #375,426 at ~12:20 CEST. Reference for "synced with public network".

## Findings before starting (12:20)
- Docker VM: 12 CPUs, 8.2 GB RAM (upstream default miner mem_limit=16g > VM RAM -> must lower). Host disk 56 GB free (94% used).
- `docker ps -a` also shows `quip-dashboard` in state Created (not mine, some other operator's half-started stack). `quip-validator` (not mine) is Up/healthy on 30333/9944. => Upstream compose hardcodes `container_name: quip-validator|quip-cpu|quip-dashboard`, host ports 30333, 20049, 80, 443, 5514 and named volumes `quip-caddy-data|config`. Running it unmodified would collide (name conflict on quip-validator/quip-dashboard, port 30333). So I use a docker-compose.override.yml (auto-loaded) with unique container names (t05cs-*), project name t05cs, ports 30334/20059/5524, no 80/443, renamed caddy volumes.
- DEVIATION/DOC DISCREPANCY: README "Setup step 1" says `cp data/config.cpu.toml data/config.toml` but that file uses the old v0.1 schema ([global] genesis_config...). docker-compose.yml instead mounts config/quip-miner.toml (the v0.3 [miner] schema) as the first-run template. I follow the compose file (skip step 1) since the miner image seeds /data/config.toml from that template.
- config/quip-miner.toml ships placeholder `public_host = "203.0.113.10"` (RFC5737 doc IP) and `public_port = 20050` marked "Required" -> must edit. README's setup steps never mention editing this file.
- README says to `sudo ./scripts/sysctl-tune.sh` (Linux BBR sysctl) -> not applicable on macOS/Docker Desktop, skipped.
- Also skipped cron.sh auto-update (would create a persistent cron job on this shared machine; user asked to leave node stopped).

## Setup done (12:27)
- repo/.env: COMPOSE_PROJECT_NAME=t05cs, PUID=501 PGID=20, CHANNEL=beta (upstream default), QUIP_LOG_PORT=5524, QUIP_MINER_CPUSET=0-1, QUIP_MINER_MEM_LIMIT=4g (VM has 8 GB), VALIDATOR_NAME.
- repo/docker-compose.override.yml: container names t05cs-{validator,miner,dashboard}; `ports: !override` (30334 p2p; 20059 -> caddy 20049; NO 80/443; log 127.0.0.1:5524); volumes renamed t05cs-caddy-*; miner also mounts ../keys:/keys.
- repo/config/quip-miner.toml edited (tracked file, so `git pull` may conflict — noted for runbook): public_host=80.215.77.73 (this Mac's public IP from api.ipify.org — GUESS: Mac is likely behind NAT so inbound isn't verified), public_port=20059, signer_key=/keys/keystore.json (so the throwaway miner key lands in ./keys), node_name set (without it no on-chain descriptor is filed).
- `docker compose --profile cpu config -q` => OK.
- Plan: start `quip-validator dashboard` first (miner waits on validator health for hours per docs), then miner once synced.

## ERROR 1 (12:31): validator crash loop `groupmod: GID '20' already exists`
- Cause: README step 3 says seed `.env` with `PUID=$(id -u) PGID=$(id -g)`. On macOS `id -g` = 20 (staff) which already exists in the Debian-based image (dialout), so the root entrypoint's groupmod fails. Doc's advice is Linux-only.
- Fix: drop PUID/PGID from .env (defaults 1000/1000); Docker Desktop bind mounts don't enforce host ownership anyway.

## ERROR 2 (12:35): dashboard crash loop `chown: changing ownership of '/data/syslog-ng/control': Invalid argument`
- Cause: base compose bind-mounts ./dashboard-data:/data; the entrypoint chowns it, which Docker Desktop macOS virtiofs bind mounts reject. (Also expect same for ./data/logs:/logs.)
- Fix attempt: override /data with a named volume `t05cs-dashboard-data` in docker-compose.override.yml (compose merges volumes by target path).
- Meanwhile validator OK: fresh sync from genesis, ~450 blocks/s, target #375,439, 4 peers.
- Fix worked: dashboard up (caddy serving), merged log data/logs/quip-node.log being written (that bind mount was OK). My node's RPC reachable at http://127.0.0.1:20059/rpc (helper ./rpc.sh). 6 peers, syncing.
- Miner image inspected (`docker run --rm --entrypoint sh <miner image> -c 'ls /usr/local/bin /app'`): entrypoint is /entrypoint.sh (tini); binaries quip-coordinator + many quip-cpu-* miners bundled. Sync progress (real clock): 12:12:48 mine=#57,404 public=#375,453, 8 peers.

## FINDING 3 (read entrypoint source, not docs): keystore path comes from env QUIP_SIGNER_KEY, NOT config `signer_key`
- /entrypoint.sh (in miner image): `KEYSTORE_FILE="${QUIP_SIGNER_KEY:-/data/keystore.json}"`; generates only there. The config comment says the entrypoint generates "at exactly this path [signer_key]" — wrong/misleading. With my `signer_key=/keys/keystore.json` and no env var the entrypoint would create /data/keystore.json while the coordinator looks at /keys/... -> unreadable -> "only warns" -> mines with a zero account, every proof fails on chain (silent failure).
- Fix: generate keystore myself into ./keys with `quip-coordinator keygen --out /keys/keystore.json` (throwaway, brand-new), and set env QUIP_SIGNER_KEY=/keys/keystore.json in override (compose base doesn't wire it).
- keystore generated at ./keys/keystore.json (0600, throwaway, testnet only; contains master_seed_hex — never copy into docs). QUIP_SIGNER_KEY added to override.

## SYNCED (12:42 CEST, ~31 min after first start)
- Sync speed was 450 bps early then 150-350 bps -> full archive sync from genesis to #375,746 in ~31 min (README says "hours"; on this hardware it was ~30 min).
- Verified: my head #375,746 == public bootnode-1 head #375,746; block-0 hash identical (0x59e064bd...c286, matches README genesis); finalized head 0x736181f0...0e31; 8 peers; validator + dashboard containers (healthy).
- Started miner: `docker compose --profile cpu up -d cpu`
- Miner start 12:42: coordinator 0.3.5-rc9, validator preflight OK: spec_name=quip spec_version=118 (README says 117 — doc drift) quantum_pow_api=2; account balance=0 -> auto-requesting faucet (https://faucet.aglais.quip.network, per config template; testnet only).
- 12:42:32 funded via faucet (balance=10000000000000 plancks = 10 AGLS, attempt 2); 12:42:36 "registered this account as a miner on chain"; topology downloaded (4577 nodes / 41514 edges); 12:42:42 "filed node descriptor"; miner cpu-0 (quip-cpu-sa) spawned; round generation=1 qblock_id=8041 block=375751; attempts stashed at energy ~-14308 vs target <= -14710 ("valid 0/128" at that point).
- (my own slip: used zsh loop var named 'path' which is tied to PATH -> 'command not found: curl'. Renamed var; not an env problem.)

## Evidence collected (12:46)
- Miner REST (http://127.0.0.1:20059/api/v1/status): ss58=5HNDzkwrGUbcXu2n46dUrYVkEFx462Kt43Q3iwMzVQRe4xii, account_id_hex=0xea89cc33...86ed, is_mining=true, miner_registered=true, registered_at=block 375750, deposit=1000000000000, proofs_submitted=0 (no winning proof yet), controller: results_received=44, contexts_dispatched=51, submission_errors=0.
- On-chain extrinsics found by scanning blocks 375744-375755 on MY node (python: blake2b-256 of raw extrinsic = tx hash; call names NOT decoded — no metadata decoding done):
  - #375749 ext1 0x96517f14...10fd (signed by another account = faucet transfer to the miner, inferred from position/timing + balance jump)
  - #375750 ext1 0x6bce7b95...50aa (signed by miner account = registration; matches registered_at)
  - #375751 ext8 0x601e4641...b4e5, #375752 ext1 0x635669a5...0a9d, #375753 ext1 0x35442efd...befb (miner-signed; likely descriptor/other)
- 12:46 stop test: 'docker compose --profile cpu stop' took ~2s; validator/dashboard Exited(0), miner Exited(137) (SIGKILL — coordinator/tini didn't exit on SIGTERM cleanly or was killed; harmless but noted). Pre-existing quip-validator still Up/healthy, untouched.

## Restart test + end state (12:46-12:47 real clock)
- `up -d quip-validator dashboard` then `up -d cpu`: validator healthy after ~15s, miner up ~17s after start; same ss58 5HNDzk...4xii, registered_at still 375750 (no re-register/re-fund), "filed node descriptor" again, is_mining=true, peers=4, head 375786 == public head 375786.
- Final: `docker compose --profile cpu stop` -> t05cs-validator/dashboard Exited(0), t05cs-miner Exited(137). Pre-existing quip-validator (Up 40 min healthy) and quip-dashboard (Created) untouched. My 3 named volumes + repo/data + ./keys retained.
- No winning proof: CPU miner (2 cores, 0.4 jobs/s) best energy -14436 vs required <= -14704 (target relaxes ~2/min). proofs_submitted=0. Not a fault; a hardware limit.
- Not done / not verified: inbound reachability of 30334/20059 from Internet (Mac behind NAT probably; public_host=80.215.77.73 is a guess); on-chain call names of the miner extrinsics not decoded; cron auto-update not installed; sysctl tune skipped (Linux-only).
- Dead ends: gitbook docs 404 x2 (quickstart, run-a-node-testnet).
- Things I did NOT do: touch other containers/volumes, use existing keys, post anywhere. Only outbound calls: gitlab clone, registry pulls, public Aglais RPC (read-only), Aglais faucet (by the miner, per the shipped config), api.ipify.org (public IP lookup).
