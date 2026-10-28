# DEVLOG — Quip Network testnet node (hobbyist run)

## Pages visited (in order)
1. web_search "Quip Network testnet node"
2. https://developers.quip.network/docs/getting-started/quickstart
3. https://developers.quip.network/docs/nodes/run-a-node-testnet
4. https://developers.quip.network/docs/nodes/miners
5. https://gitlab.com/quip.network/nodes.quip.network — official deployment repo.
   Read README.md, docker-compose.yml, docker-compose.localdev.yml, env.example,
   data/config.cpu.toml, config/quip-miner.toml, Makefile,
   scripts/validator-healthcheck.sh, AGENTS.md (skimmed). (Web extractor timed out
   on GitLab; used the gitlab.com API + `git clone --depth 1` instead.)

## Key facts learned
- Testnet "Aglais" (chain id quip_testnet, token AGLS, genesis 0x59e0…c286 since
  2026-09-02). Live head ~#478k at run time (~6s blocks). Runtime spec 118 (117
  at genesis; upgrade block is somewhere > #13k).
- Stack: quip-miner (coordinator + quip-cpu-sa), bundled substrate validator
  (archive), dashboard (Caddy + embedded index + syslog collector). Miner
  self-bootstraps: generates keystore, faucet-funds, registers in QuantumPow.Miners.
- Stock names/ports: quip-cpu/quip-validator/quip-dashboard; quip-caddy-data/
  -config; host 20049/80/443/30333 tcp+udp/5514 udp.
- Public RPC: wss://bootnode-{1,2,3}.aglais.quip.network:20049/rpc (39-40 peers,
  head #478149+). DefaultTopology registered; 821 miners in QuantumPow.Miners.

## Environment
- macOS 26.5.1 Apple Silicon; Docker Desktop VM linux/aarch64 8 GiB RAM 12 vCPU;
  compose v2.40.3; uid=501 gid=20; ports 31600-31604 free.
- Pre-existing Docker objects NOT touched: running devhobbya-node
  (quip-network-node:v0.3.1), stopped t05cs-{miner,dashboard,validator},
  quip-dashboard (created), quip-validator (exited), buildkit builder.
- Pre-existing Quip images reused for layers (shared; left in place).

## Adaptations (why)
- Project -p devhobbyb-quip; containers devhobbyb-{miner,validator,dashboard};
  volumes devhobbyb-caddy-{data,config}; network devhobbyb-quip-net.
- Ports: 31600->20049, 31601->80, 31602->443, 31603->30333 tcp+udp,
  31604->5514/udp (QUIP_LOG_PORT=31604).
- .env: QUIP_HOSTNAME=:20049 (dev HTTP), QUIP_MINER_CPUSET=0, MEM_LIMIT=4g,
  VALIDATOR_NAME=devhobbyb-validator,
  QUIP_VALIDATOR_RPC_URLS=bootnode-1 WSS first, local ws fallback.
- data/config.toml: copied from config/quip-miner.toml; validators = 3 public
  bootnodes (local removed while it syncs — its best-block state is spec 117 /
  pre-topology); node_name=devhobbyb-miner.
- Validator service pinned PUID=1000/PGID=1000 (host PGID 20 crash-loops its
  entrypoint). Miner/dashboard run as 501:20.
- pull_policy changed always->missing (flaky registry; images verified current).
- Changes folded into docker-compose.yml directly (override port lists APPEND).

## Commands (mattering)
- git clone --depth 1 https://gitlab.com/quip.network/nodes.quip.network quip-deploy
- .venv + websockets + xxhash; probe_rpc.py (bootnodes healthy), probe_state.py
  (DefaultTopology + Miners enumeration), verify_account.py (my account on-chain)
- cp config/quip-miner.toml data/config.toml + edits (validators, node_name)
- docker compose -p devhobbyb-quip --profile cpu pull (retried; then missing)
- docker compose -p devhobbyb-quip --profile cpu up -d
- docker compose ... restart cpu (x2: signer fix, validators fix)
- docker compose -p devhobbyb-quip --profile cpu down --remove-orphans (cleanup)
- docker volume rm devhobbyb-caddy-data devhobbyb-caddy-config

## Timeline of key events
- Validator: crash-loop (GID 20) -> fixed with PUID/PGID 1000 -> syncing from
  genesis: #9792 @+15min, #13248 @+25min (chunked download/import), 6-8 peers,
  target #478154. Health: starting (by design until synced).
- Miner: first boot generated keystore; my /keys signer path ignored by
  entrypoint -> reverted to /data/keystore.json + ./keys symlink.
- Miner bootstrap: faucet funded 20000000000000 plancks (attempt 9);
  "registered this account as a miner on chain"; spawned cpu-0 (quip-cpu-sa);
  preflight spec 118 / quantum_pow_api 2.
- Feeder: could not fetch mining snapshot — bootnode state_call
  timeouts/UnknownBlock at pinned hashes; local validator not synced. No proof
  staged/submitted this session (expected given the README's initial-sync caveat).
- On-chain verify: QuantumPow.Miners[0x23017f8b…]=0xf04a07…; System.Account
  nonce=1 free=18.999038289298 UNIT. Account ss58
  5Crbygt5tbaXVNUe2dhA2c9XpZhuG32KhpHMHHRrR9m7pv4Z.

## Errors (chronological)
1. registry.gitlab.com TLS handshake timeouts (pull attempt 1) — transient; OK on retry.
2. compose override ports APPEND (would bind stock ports too) — fixed by editing base file.
3. up -d hung on pull re-check (pull_policy: always + flaky registry) — killed my
   own process, switched to pull_policy: missing.
4. Validator crash loop: groupmod GID 20 exists — pinned PUID/PGID=1000.
5. Miner signer: entrypoint ignores config signer_key path — reverted to stock.
6. Feeder: bootnode state_call Request timeout / UnknownBlock; local validator
   spec 117 at best block — miner waits; documented.
7. My twox128/xxh64 hand-rolled impl wrong byte order — replaced with xxhash lib
   (byte-reversed digests) to build storage keys correctly.
8. GitLab web pages time out in extractor — used API/clone.
