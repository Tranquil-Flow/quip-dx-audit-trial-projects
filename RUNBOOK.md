# Quip testnet miner — Ops runbook

This stack runs ONE container: `t05-quip-cpu`. It is a thin client of the
existing `quip-validator` already on this host, which talks to Aglais
(`AGLS (Quip Testnet)`, runtime spec 118). No second validator, no
dashboard, no faucet sidecar.

Container / project names are prefixed `t05-` so they cannot collide with
the upstream `quip-*` stack or with the half-dozen other Quip projects on
this machine (`aglais-mine`, `cs05quip`, `dev-quip`, `quip-dev`,
`t05quip`, etc.).

All commands assume `cd /private/tmp/devtrials3/t05-minimax-m3`.

## Files

- `docker-compose.yml` — single `miner` service
- `.env` — `QUIP_MINER_TAG=stable` (override per deploy)
- `config/quip-miner.toml` — v0.3 first-run template, mounted over
  `/app/config.toml`; entrypoint seeds it to `/data/config.toml`
- `data/keystore.json` — H4 hybrid sr25519+FN-DSA-512 keystore (generated
  on first run; BACK THIS UP — chain account lives here)
- `data/config.toml` — live config (after first run, edits here)
- `keys/keystore.json` — backup copy of the keystore (mode 600)
- `data/attempts/<qblock_id>/attempts.jsonl` — every SA attempt with
  energies, job ids, threshold

## Start

    docker compose -p t05-quipdev pull             # refresh image
    docker compose -p t05-quipdev up -d            # start
    docker compose -p t05-quipdev logs -f          # follow logs

First boot takes ~30s end-to-end: keystore generation, RPC handshake,
faucet drip (~6s), chain registration, descriptor file, miner spawn.

If `data/keystore.json` is deleted the entrypoint will generate a new
key, the on-chain identity changes, and the existing deposit is lost —
back up the file before any destructive action.

## Verify

    # Miner REST surface (loopback only)
    curl -s http://127.0.0.1:8086/healthz
    curl -s http://127.0.0.1:8086/api/v1/status | python3 -m json.tool
    curl -s http://127.0.0.1:8086/api/v1/stats  | python3 -m json.tool
    curl -s "http://127.0.0.1:8086/api/v1/mining/attempts?qblock_id=8036&solution_number=1"

Look for `data.is_mining == true`, `data.miner_registered == true`,
`data.modes.cpu.controller.results_received` increasing, and chain head
(`data.chain.head_number`) advancing at ~6s/block.

## Logs

    docker logs t05-quip-cpu -f                  # docker stdout (json-file)
    docker logs t05-quip-cpu --tail 200          # last 200 lines
    tail -f data/logs/quip-node.log 2>/dev/null  # (not used; syslog driver disabled)

The miner logs at INFO by default; RUST_LOG in `docker-compose.yml` is
`info,quip_coordinator=debug,quip_miner=debug` for richer first-run info.
Drop the debug filters in steady state.

## Stop

    docker compose -p t05-quipdev stop            # SIGTERM, keeps container
    docker compose -p t05-quipdev down            # stop + remove container
    docker compose -p t05-quipdev down --volumes  # also remove `data/`

`down` removes the container and the `t05-quipdev_default` bridge network.
It does NOT touch:
- `data/` (keystore, config, attempt history) — survives on host
- `keys/` (manual backup)
- The pre-existing `quip-validator` and `quip-dashboard` containers

## Restart

After a stop:

    cd /private/tmp/devtrials3/t05-minimax-m3
    docker compose -p t05-quipdev up -d

The container comes back with the same identity (keystore is on the host
volume), reconnects to `host.docker.internal:9944`, finds itself already
registered, and resumes mining within ~5s. No faucet re-drip unless the
on-chain balance has been spent below the threshold.

If `host.docker.internal:9944` is unreachable (e.g. the existing
`quip-validator` is stopped), the coordinator will retry forever; restart
the validator first.

## Upgrade

The image is pulled from `registry.gitlab.com/quip.network/quip-miner/v0.3/quip-miner`
with tag `${QUIP_MINER_TAG}` (default `beta`). To upgrade:

    # 1. edit .env
    QUIP_MINER_TAG=stable   # or v0.3.1-rc4, or beta

    # 2. pull + recreate
    cd /private/tmp/devtrials3/t05-minimax-m3
    docker compose -p t05-quipdev pull
    docker compose -p t05-quipdev up -d --force-recreate

A v0.2 -> v0.3 config migration would normally need `make updateconfig`
(see upstream docs). Our `config/quip-miner.toml` is already v0.3, so
fresh boots are unaffected. If a v0.2 upgrade is needed in future:

    docker run --rm \
      -v "$PWD/data:/data" \
      -v "$PWD/scripts/upgrade-config.py:/upgrade-config.py:ro" \
      python:3.12-alpine python3 /upgrade-config.py /data

## Common gotchas

- Port 9944 must be reachable on the host. The existing validator binds
  it on `127.0.0.1` only; the miner reaches it via `host.docker.internal`.
- `shm_size: 2gb` is REQUIRED. Docker's default 64 MiB /dev/shm will SIGBUS
  the SA miner.
- `cpuset: "0"` keeps the miner on a single core. Raise it for more
  throughput by editing docker-compose.yml.
- An empty `public_host` is a hard failure (coordinator exits 64).
  We set `public_host = "t05-quip-miner.local"` so the on-chain
  descriptor is filed; mining itself does not need a reachable address.
- The `ss58` field in `keystore.json` is stale H3-era metadata and is NOT
  the account the miner uses. Read it from `/api/v1/status` instead.

## Where things live

| Concern | Path |
| --- | --- |
| Compose file | `docker-compose.yml` |
| Miner config (template) | `config/quip-miner.toml` |
| Miner config (live) | `data/config.toml` (after first start) |
| Keystore | `data/keystore.json` (backup at `keys/keystore.json`) |
| Mining attempts | `data/attempts/<qblock_id>/attempts.jsonl` |
| Per-qblock stash | `data/attempts/<qblock_id>/attempts.json` |
| Logs | `docker logs t05-quip-cpu` (json-file driver, 10m x 5) |
| Env vars | `.env` (just `QUIP_MINER_TAG=stable`) |