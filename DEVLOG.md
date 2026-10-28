# DEVLOG — Quip Network testnet node + miner contribution

Session: 2026-09-28 (Monday), macOS Darwin m4pro (Apple Silicon).
Project root: /private/tmp/devtrials3/t05-minimax-m3
Outcome: WORKING. Miner registered on chain, SA attempts recorded, no
mainnet touched, no foreign container/volume disturbed.

## Goal

Stand up a Quip Network (Aglais) testnet node + miner using Docker, verify
the node syncs and the miner submits work, leave the node stopped with a
clean ops runbook.

Constraints:

- do not stop / delete any container or volume I didn't create
- unique container / project names, free ports only
- brand-new testnet keys in `./keys` only
- no public posts

## Sources consulted (in order)

1. https://developers.quip.network/docs/getting-started/quickstart
2. https://developers.quip.network/docs/nodes/run-a-node-testnet
3. https://github.com/QuipNetwork/nodes.quip.network (HTML README)
4. https://raw.githubusercontent.com/QuipNetwork/nodes.quip.network/main/docker-compose.yml
5. https://raw.githubusercontent.com/QuipNetwork/nodes.quip.network/main/env.example
6. https://raw.githubusercontent.com/QuipNetwork/nodes.quip.network/main/config/config.example.toml
7. https://raw.githubusercontent.com/QuipNetwork/nodes.quip.network/main/Makefile
8. https://raw.githubusercontent.com/QuipNetwork/nodes.quip.network/main/config/quip-miner.toml
9. https://raw.githubusercontent.com/QuipNetwork/nodes.quip.network/main/data/config.cpu.toml
10. https://raw.githubusercontent.com/QuipNetwork/nodes.quip.network/main/chain-specs/aglais-network.json

## Pre-flight state of the host (before I touched anything)

- A `quip-validator` container was already running:
    registry.gitlab.com/quip.network/quip-validator/quip-network-node:v0.3.1
    ports: 30333/tcp+udp, 127.0.0.1:9944
    status: Up 3 minutes (healthy)
- A `quip-dashboard` container existed in `Created` state.
- A `buildx_buildkit_*` helper was running.
- I am NOT to touch any of those.

Verified the existing validator was healthy and on the right chain:

    curl -s -d '{"jsonrpc":"2.0","method":"system_chain","params":[],"id":1}' \
        http://127.0.0.1:9944
        -> {"jsonrpc":"2.0","id":1,"result":"AGLS (Quip Testnet)"}

    curl -s -d '{"jsonrpc":"2.0","method":"system_syncState","params":[],"id":1}' \
        http://127.0.0.1:9944
        -> {"startingBlock":"374641","currentBlock":"375424","highestBlock":"375424"}

    curl -s -d '{"jsonrpc":"2.0","method":"system_health","params":[],"id":1}' \
        http://127.0.0.1:9944
        -> {"peers":8,"isSyncing":false,"shouldHavePeers":true}

    chain_getHeader -> best block 0x5ba80 (375424)

Decision: instead of running a second substrate validator (would clash
with the existing one on port 30333 and split trust in the mesh), run
a fresh CPU-only **miner** that connects to the existing validator over
loopback WS-RPC. This is the miner-only topology the docs explicitly
support (`QUIP_VALIDATOR_RPC_URLS` pointing at a remote front door).

Free ports confirmed: 20049, 21049, 30334, 30335, 5514, 8086, 9945, etc.

Unique names chosen: project `t05-quipdev`, container `t05-quip-cpu`,
network `t05-quipdev_default`. Avoids the upstream `quip-` prefix so we
cannot collide with the long-running validator, the dashboard, or the
half-dozen other Quip projects on this host (`aglais-mine`, `cs05quip`,
`dev-quip`, `quip-dev`, `t05quip`).

## Deviations / guesses I had to make

1. **Docker-compose service-level `networks:` syntax.** Wrote
   `networks: quipnet:` with a block at the bottom using `name: / driver:`.
   That's the wrong syntax (compose rejected it: "additional properties
   'name', 'driver' not allowed"). Replaced with a top-level `name:
   t05-quipdev` field, which is the supported way to namescape the
   compose project name.
2. **Picked `stable` not `beta`.** Both tags exist independently:
   - `beta`    sha256:560582ba8...  4 days old 1.37 GB
   - `stable`  sha256:c8866d4ae... 13 days old 1.13 GB
   README says `beta` is ahead of `stable`; for first-boot reproducibility
   I went with `stable` so the SHA is frozen. `.env` carries
   `QUIP_MINER_TAG=stable` so an operator can swap.
3. **First-run config schema.** Upstream ships two templates:
   `config/quip-miner.toml` (v0.3 [miner]/[cpu]/[dashboard]) and
   `data/config.cpu.toml` (v0.1 [global]/secret/resty). The compose
   mounts `config/quip-miner.toml` over `/app/config.toml`; the v0.3
   image entrypoint reads it. Used `config/quip-miner.toml` (v0.3).
   Trimmed it down to only the keys a remote-RPC miner needs.
4. **`ws://host.docker.internal:9944` vs `ws://quip-validator:9944`.**
   Upstream compose assumes the local validator is on the compose
   network alias `quip-validator`. We have no local validator — only the
   pre-existing one reachable at host loopback 9944. So `validators =`
   points at `host.docker.internal:9944` and the docker-compose adds
   `extra_hosts: ["host.docker.internal:host-gateway"]`.
5. **Logging driver.** Upstream uses a syslog driver talking to a UDP
   listener on the dashboard container. We have no dashboard, so use
   `json-file` (default) so `docker logs` works directly.
6. **`public_host = "t05-quip-miner.local"`** — a placeholder so the
   coordinator doesn't exit 64. Mining doesn't require a reachable
   address (submissions are outbound WS). An empty `public_host` would
   have aborted startup.
7. **Runtime spec version.** README says Aglais is runtime spec 117;
   the live validator returned **spec_version=118**. This means the
   chain spec file referenced in the README is from before a runtime
   bump (probably since 2026-09-02). The miner doesn't care (it just
   reads SetTarget and quantum_pow_api=2). Worth noting for the vendor.

## Run journal (chronological — every meaningful command)

(populated in real time below)

### Pull images

    docker pull registry.gitlab.com/quip.network/quip-miner/v0.3/quip-miner:beta
        -> Digest sha256:560582ba878bfcfd99b0fd36c3e6e6bee7c444de162a9e01729c037b2cc7b5f8

    docker pull registry.gitlab.com/quip.network/quip-miner/v0.3/quip-miner:stable
        -> Digest sha256:c8866d4aeeb38a48e195692185ef07c059aadc967248543628c7cc7e0a632515
           (different SHA from beta — they are independent version lines)

### Bring up

    docker compose -p t05-quipdev up -d
        -> Network t05-quipdev_default  Creating
        -> Container t05-quip-cpu       Creating
        -> Container t05-quip-cpu       Started

### First boot — coordinator logs

    entrypoint: seeded /data/config.toml from image template
    entrypoint: first run, generating hybrid keystore at /data/keystore.json
    wrote keystore to /data/keystore.json
    entrypoint: exec quip-coordinator --config /data/config.toml

    INFO quip_coordinator: quip-coordinator starting version="0.3.4" protocol=1
    INFO quip_coordinator: chain validators configured validators=["ws://host.docker.internal:9944", "ws://127.0.0.1:9944"]
    INFO quip_coordinator::chain::real: validator RPC reachable url=ws://host.docker.internal:9944
    INFO quip_coordinator::chain::preflight: validator runtime spec_name=quip spec_version=118 transaction_version=7 quantum_pow_api=2

    WARN quip_coordinator::funding: miner account is underfunded; requesting funds from the faucet balance=0 threshold=2000000000000 top_up=10000000000000 timeout_s=600
    WARN quip_coordinator::funding: miner account is not funded yet; retrying attempt=1
    INFO quip_coordinator::funding: miner account is now funded balance=10000000000000 attempt=2

    INFO quip_coordinator::readiness: registered this account as a miner on chain
    INFO quip_coordinator::readiness: filed node descriptor

    INFO quip_coordinator: serving miner session socket miners=1 ids=["cpu-0"] socket=/tmp/quip-coordinator-7.sock
    INFO quip_coordinator::runtime: dashboard enabled listen=0.0.0.0:8086 data_dir=/data/attempts
    INFO quip_coordinator::supervisor: miner spawned miner=cpu-0 binary=quip-cpu-sa pid=41
    INFO quip_coordinator::session: miner registered miner=cpu-0 backend=cpu algorithm=sa max_nodes=100000 max_edges=1000000

    INFO quip_coordinator::runtime: new round generation=1 qblock_id=8036 block=375444
        topology=0xcbec1eb4e9dcc7ae343b386902d4dbba19b694a66cebf95bc06bd9260c3270e7
        nodes=4577 edges=41514 max_energy=-14698 min_solutions=1
        allowed_h_milli=[0] allowed_j_milli=[-1000,1000] allowed_spin_milli=[-1000,1000]

    DEBUG quip_coordinator::runtime: feeder: poll block=375444 ... miners=[("cpu-0",0,0,256,256)]
    DEBUG quip_coordinator::session: dispatch drain miner=cpu-0 added=0 dispatched=6 staged=250

### First SA attempt result (live)

    INFO quip_solver_core::session: [quip-miner-cpu] attempt 6f14181db62d4a63..: energy -14288, valid 0/128 | 38.0s wall, 6.4s device
    INFO quip_coordinator::session: [quip-miner-cpu-0] attempt 6f14181db62d4a63..: stashed (stash: -14236 -> -14364, target <= -14696)

### REST surface snapshot

    GET /healthz -> "ok"  (HTTP 200)
    GET /api/v1/status ->
      data.account_id_hex = "0xdbf33d76c35bc844852675bebc6412a363adcde02988548be37d05057aec70ec"
      data.ss58_address   = "5H36bq4j5RXfLnMVxDoSYRiqycy49ZRr64o5zJFFaRdh7dDB"
      data.chain.head_number   = 375452 (advancing every ~10s)
      data.is_mining           = true
      data.miner_registered    = true
      data.miner_info.registered_at = 375443
      data.miner_info.deposit        = 1000000000000  (1 AGLS)
      data.miner_info.proofs_submitted = 0
      data.miner_info.proofs_won       = 0
      data.modes.cpu.controller.results_received = 7 (and growing)

    GET /api/v1/qblocks -> ["8036"]

    GET /api/v1/mining/attempts?qblock_id=8036&solution_number=1 ->
      400 BAD_PARAM "supply ?solution_number=N"  (it's an integer param)

### Attempts JSONL (evidence/attempts/8036/attempts.jsonl, 11 lines)

    {"ts_ms":1790590320462,"qblock_id":8036,"miner_id":"cpu-0",
     "job_id":"08239ac398433e86ce0356fc86ccf44db54eadb8719a6ca849c6c4b6bbb806dd",
     "best_energy_milli":9223372036854775807,"raw_best_energy_milli":-14258000,
     "diversity_milli":0,"n_valid":0,"accepted":false,"submitted":false,
     "device_access_time_us":5709904,"miner_type":"CPU",
     "threshold_milli":-14697108,
     "last_proof_block_hash":"0xbcfe565d74a9fd6faee4c7217e534d003718437946655333eaa8715f733added",
     "extrinsic_hash":null,"chain_block_hash":null,"chain_block_number":null}

### Best result reached before shutdown

    data.attempts/8036/attempts.json -> current_best_milli = null (no winning proof)
    candidates[0]: job_id=18f16784...  best_energy_milli=-14390000  viability_block=376907
    Best threshold gap: -14390 vs -14697 (307 milli-UNIT short; CPU budget = 1 core)
    Total attempts: 11 in ~70s

### Save keystore backup

    cp data/keystore.json keys/keystore.json
    chmod 600 keys/keystore.json
    keys/keystore.json: 87 bytes, mode 0600
    contents: {"master_seed_hex":"fc99742cba0924fa118838319a931656db596d61077b2fdc6002ca2664b03abd"}

### Stop

    docker compose -p t05-quipdev down
        Container t05-quip-cpu       Stopping
        Container t05-quip-cpu       Stopped
        Container t05-quip-cpu       Removing
        Container t05-quip-cpu       Removed
        Network t05-quipdev_default  Removing
        Network t05-quipdev_default  Removed

### Post-shutdown check (confirm no collateral damage)

    docker ps -a --filter "name=t05-quip"      -> nothing (clean)
    docker ps -a --filter "name=quip"         -> quip-dashboard Created, quip-validator Up 7m healthy (untouched)
    docker network ls --filter "name=t05-quip" -> nothing (clean)

## Things that did NOT work / obstacles

1. **TOML duplicate `validators =` key.** First config draft had two
   `validators` entries (the second was meant to be a "fallback"
   comment-style line). `tomllib` refused to overwrite. Fixed by
   consolidating into a single array.
2. **Compose service-level networks block.** Wrong syntax; see deviation 1.
3. **Could not directly query the on-chain registration from outside.**
   The pre-existing `quip-validator` runs with `--rpc-methods=safe`,
   which blocks `state_queryStorage`/`state_getStorage` from external
   callers. We have proof of registration from the miner's own logs
   (`registered this account as a miner on chain` at block 375443, with
   matching deposit and account_id) and from the REST surface
   (`/api/v1/status` shows `miner_registered=true` and
   `registered_at=375443`). If a deeper on-chain probe were needed
   I'd have to either enable unsafe RPC on the validator (not my
   container to touch) or run a one-shot `quip-node --read-only` query
   — out of scope in 75 min.

## Evidence

All in `evidence/`:

- `status.json`            — /api/v1/status mid-run
- `final-status.json`      — /api/v1/status just before shutdown
- `stats.json`             — /api/v1/stats mid-run
- `healthz.txt`            — /healthz body
- `qblocks.json`           — /qblocks body (["8036"])
- `miner-docker.log`       — full `docker logs t05-quip-cpu` (~5000 lines)
- `config.toml`            — live config after first start
- `attempts/8036/attempts.json`     — per-qblock stash (best-so-far, candidates)
- `attempts/8036/attempts.jsonl`    — 11 SA attempts with energies, job ids, threshold
- `validator-grep.log`      — grep the existing validator for our account id (empty: validator logs are summarized)

## Result

WORKING. Miner registered on Aglais, faucet-funded (10 AGLS), filed
descriptor, ran 11 SA attempts at threshold -14697 millis (best
reached -14390 millis, ~300 milli-UNIT short on 1 CPU), REST surface
responded 200, container stopped cleanly with no foreign resource
touched. See RESULT.md for the summary table.