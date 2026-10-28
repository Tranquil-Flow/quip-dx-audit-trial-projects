# RESULT — Quip Aglais testnet node + CPU miner on this Mac (Docker)

## Status: WORKING (with two caveats — see "What did not work")
Node fully synced with the public Aglais testnet, miner registered on chain and doing real mining
work (CPU simulated-annealing jobs against the on-chain topology). **Left STOPPED** as requested.

## How to run
Full runbook: `RUNBOOK.md`. Short form (from `./repo`):
```bash
cd /private/tmp/devtrials3/t05-claude-sonnet/repo
docker compose --profile cpu up -d quip-validator dashboard   # node (+ dashboard, log collector)
docker compose --profile cpu up -d cpu                        # miner
docker compose --profile cpu stop                             # stop again (keeps all data)
```
Stack = official `gitlab.com/quip.network/nodes.quip.network` compose (images `:beta`) + local
`docker-compose.override.yml` and `.env`. Project `t05cs`, containers `t05cs-{validator,miner,dashboard}`,
ports p2p 30334, front door http://127.0.0.1:20059, logs udp 5524. Throwaway miner key: `./keys/keystore.json`.

## Evidence
- Chain: Aglais, genesis `0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286` — block 0 hash identical on
  my node and public `bootnode-1.aglais.quip.network:20049/rpc`; runtime spec 118, QuantumPowApi v2.
- Sync: fresh archive sync from genesis, first start ≈12:11, `isSyncing:false` at 12:42 (~31 min).
  Head **#375,746 mine == #375,746 public** at 12:42; #375,786 == #375,786 at 12:46 after restart.
  Finalized head 0x736181f055f3fe6628ad2568b7fcf05358eba93a0d6746953beeef829d990e31. Block hashes #375749/#375750 identical on both.
  Peers: 8 (4 after restart). Node libp2p id `12D3KooWPTifqpdeWFpcuTZQH8ygv5SnaMksQXHBaPKdmL4CZSML`.
- Miner account (ss58): `5HNDzkwrGUbcXu2n46dUrYVkEFx462Kt43Q3iwMzVQRe4xii`
  (hex `0xea89cc33f0f7c4bfccf0ca4397b456e42b88b09a0df29b5a9f80f56a61dc86ed`), key generated fresh with `quip-coordinator keygen`.
- Miner log: auto-funded from Aglais faucet (10 AGLS), "registered this account as a miner on chain", "filed node descriptor",
  "registered ... as a mempool solver", topology downloaded (4577 nodes / 41514 edges), `miner spawned cpu-0 quip-cpu-sa`,
  rounds qblock 8041 → 8042 …, `progress: 60 jobs | 0.4 jobs/s | best=-14436 | requires energy<=-14704`.
- Miner REST `/api/v1/status`: `is_mining:true`, `miner_registered:true`, `registered_at:375750`, `deposit:1000000000000`,
  controller `results_received:64`, `contexts_dispatched:78`, `submission_errors:0` (`evidence-status-before-stop.txt`).
- On-chain extrinsics for the miner account, found by scanning my node's blocks (blake2-256 of the raw extrinsic;
  call names not decoded): #375749 `0x96517f1433bde568253f3ec416433c8fd9fc4e31210a0c6f460db396e79110fd` (funding, inferred),
  #375750 `0x6bce7b95692c9ae681e23950058e725c2d3efc44f4c08d5c62fb1e53578650aa` (registration, matches `registered_at`),
  #375751 `0x601e4641875842ee3eaca3fd12e12fc5b273864d0743fb81fa318ae21c03b4e5`,
  #375752 `0x635669a5c1c55a95bf75f648b82f1dc436148f1e4cd7bc0e02dea8271b2e0a9d`,
  #375753 `0x35442efd982fd1f24fb8debe511cfe92002dab6fb2a0e9f5e154740dd96beefb`.
- Stop/restart tested: stop ≈2 s; restart → healthy ≈15 s, same account, no re-registration.
- Isolation: pre-existing `quip-validator` (ports 30333/9944) and `quip-dashboard` and all other volumes/networks untouched throughout.

## What did not work / caveats
1. **No winning proof yet** (`proofs_submitted: 0`). One-two CPU cores reach best energy ≈ -14436 vs a target of ≈ -14704 (relaxing ~2/min);
   this network is realistically QPU/GPU territory. So "doing mining work" is verified (jobs, attempts, validated results); "earning rewards" is not.
2. **Not verified reachable from the Internet.** Mac is presumably behind NAT; `public_host=80.215.77.73` (from api.ipify.org) is a guess and
   30334/20059 need router forwarding. Outbound-only peering worked fine (8 peers).
3. Upstream instructions failed as written on macOS/Docker Desktop and needed workarounds (all in DEVLOG.md): container-name/port collisions with
   the existing node (override file), `PGID=$(id -g)`=20 crash loop, dashboard bind-mount chown failure, miner keystore path env var,
   miner mem limit 16g > 8 GB Docker VM. Gitbook docs URLs returned 404; I used the GitLab repo README/compose/entrypoint source instead.
4. Miner exits 137 on `stop` (harmless). Cron auto-update and sysctl tuning intentionally not applied.

## What would have made this easier (vendor docs/tools)
- Working docs links: both gitbook pages surfaced by search (`/nodes/run-a-node-testnet`, `/getting-started/quickstart`) 404.
- Make container names, host ports and volume names configurable via `.env` (`QUIP_P2P_PORT`, `QUIP_HTTP_PORT`, `COMPOSE_PROJECT_NAME`-based names)
  instead of hardcoded `container_name`/`30333`/`80`/`443`/`quip-caddy-*`; a documented "coexist with another node" recipe.
- README setup step 1 (`cp data/config.cpu.toml data/config.toml`) is the obsolete v0.1 schema; the compose actually uses `config/quip-miner.toml`. Remove/replace.
- `config/quip-miner.toml` ships placeholder `public_host=203.0.113.10` and the "entrypoint generates a keystore at exactly signer_key" comment is wrong —
  the entrypoint uses env `QUIP_SIGNER_KEY`; a custom `signer_key` silently yields an unreadable keystore. Wire `QUIP_SIGNER_KEY` in compose or make it read the config.
- macOS/Docker Desktop notes: don't seed `PGID` from `id -g` (20 collides in the image); avoid chown on bind mounts (or use named volumes) for the dashboard.
- Scale defaults to the host: `mem_limit: 16g` default vs. small Docker VMs; sync-time expectation ("hours") was ~30 min here — a progress/ETA hint would help.
- A one-shot `make status`/`quip-admin verify` that prints "synced vs public head, miner registered, jobs/s, proofs" — I had to assemble this from RPC + REST + logs.
- Runtime version in README (spec 117) is stale (actual 118).
