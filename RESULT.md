# RESULT.md — Quip Network testnet node on macOS

Status: WORKING (miner registered on-chain; validator mid-sync; containers cleaned up after the run)

## What was built
A Quip Network "Aglais" testnet node from the official deployment repo
(gitlab.com/quip.network/nodes.quip.network), running on this Mac via Docker:
- devhobbyb-miner: quip-coordinator 0.3.5-rc9 + quip-cpu-sa (CPU miner, 1 CPU, 4 GiB cap)
- devhobbyb-validator: quip-network-node substrate validator (archive, syncing from genesis)
- devhobbyb-dashboard: Caddy + mining telemetry dashboard + log collector
- project devhobbyb-quip; network devhobbyb-quip-net; volumes devhobbyb-caddy-data/-config
- host ports: 31600->20049 (dashboard/RPC/API), 31601->80, 31602->443, 31603->30333
  (libp2p tcp+udp), 31604->5514/udp (log collector). All other traffic stays on the
  internal compose network. Everything lives under this project directory.

## How to run it
```
cd /private/tmp/projects/proj-4d3b9c/quip-deploy
docker compose -p devhobbyb-quip --profile cpu up -d
docker compose -p devhobbyb-quip --profile cpu logs -f        # or: docker logs devhobbyb-miner
open http://localhost:31600/                                  # dashboard
```
Stop: `docker compose -p devhobbyb-quip --profile cpu down --remove-orphans`
(resume later: just `up -d` again — chain DB and dashboard index persist in ./data
and ./dashboard-data; validator continues syncing from where it stopped).

## Evidence (captured during the run)
On-chain (Aglais, verified via public RPC state queries):
- Miner account: 5Crbygt5tbaXVNUe2dhA2c9XpZhuG32KhpHMHHRrR9m7pv4Z
  (0x23017f8b495c2b372d53f4d945107c17831e8e897df18262497d4b557bbec1c3)
- QuantumPow.Miners[that account] = 0xf04a07... (present → registered as a miner)
- System.Account: nonce=1, free=18.999038289298 UNIT (faucet sent 20 UNIT,
  ~1 UNIT fee for the registration extrinsic) — account was created fresh by the
  miner's first boot (keystore auto-generated in quip-deploy/data/keystore.json,
  symlinked at ./keys/keystore.json).
Miner logs (quip-deploy/data/logs/quip-node.log):
- "miner account is now funded balance=20000000000000 attempt=9" (Aglais faucet)
- "registered this account as a miner on chain"
- "miner spawned miner=cpu-0 binary=quip-cpu-sa"; REST status shows miner cpu-0 CPU
- preflight: runtime spec_name=quip spec_version=118, quantum_pow_api=2 (against
  wss://bootnode-1.aglais.quip.network:20049/rpc)
Validator logs:
- "Syncing ... target=#478154 (7 peers), best: #13248, finalized #12800" —
  archive sync from genesis progressing (chunked download then import).
Chain facts: Aglais head #478,154 (block time ~6s), DefaultTopology registered,
821 miners in QuantumPow.Miners.

## What did NOT work
- The miner never staged/submitted a proof in the session. The feeder needs the
  chain "mining snapshot" via a runtime state_call; the public bootnode RPCs kept
  timing out or answering UnknownBlock for the pinned-block reads from this
  network, and the colocated validator (the real fix) was still at block ~13k of
  ~478k (spec 117 at that height — the spec-118 upgrade is later, so the miner
  correctly refuses to mine against it). Once the local archive sync completes,
  the miner will stage work from the local validator (see config note in
  data/config.toml about re-adding ws://quip-validator:9944).
- Image pulls initially failed with TLS handshake timeouts to registry.gitlab.com
  (transient network); worked on retry. pull_policy was set to `missing` so a
  flaky registry can't wedge `up` (images verified present/current).
- My first keystore attempt (signer_key=/keys/keystore.json) was ignored by the
  entrypoint, which always generates at /data/keystore.json — reverted to stock
  and symlinked ./keys.
- Validator entrypoint crash-looped with host PGID=20 ("groupmod: GID '20'
  already exists") — fixed by pinning PUID/PGID=1000 for the validator service.

## Cleanup done
- `docker compose -p devhobbyb-quip --profile cpu down --remove-orphans`
- named volumes devhobbyb-caddy-data / devhobbyb-caddy-config removed;
  network devhobbyb-quip-net removed with the project.
- Other machines' containers untouched (verified devhobbya-node still running).
- Images left in place: they were pre-existing and shared (removing them would
  hurt the sibling node). Project disk usage: ~160 MB data + ~10 MB venv — well
  under the 15 GB budget.

## Top 5 changes to the vendor's docs/site
1. Fix the stale Setup section in the deployment README: it says to copy
   data/config.cpu.toml (retired [global] schema) while the compose file seeds
   the new [miner] schema from config/quip-miner.toml — the two contradict.
2. Remove/update the dead public RPC hostname wss://cpu-1.nodes.quip.network/rpc
   in env.example (does not resolve); keep the bootnode list as the canonical one.
3. Document the full port surface of the compose stack on the "Run A Node
   (TestNet)" docs page (80/443/20049/30333 tcp+udp/5514 udp), and warn that the
   stock container names (quip-validator etc.) are fixed — renames break
   cron.sh's profile detection.
4. Add an operator note that host PGID values colliding with image groups (e.g.
   20) crash-loop the validator entrypoint ("groupmod: GID '20' already exists"),
   and that docker compose override files APPEND ports instead of replacing them.
5. State on the miners page that the miner cannot stage work while the bundled
   validator is doing its initial archive sync, and that the public bootnode RPCs
   are not archive nodes (state reads at pinned older blocks fail) — point
   operators at an archive-capable public RPC or expect the multi-hour sync first.

## Files
- quip-deploy/           official repo clone + my adapted compose/.env/config
- quip-deploy/data/      miner data incl. chain DB (sync state persists), keystore
- keys/keystore.json     symlink to the throwaway testnet miner key
- probe_rpc.py, probe_state.py, probe_pallet.py, verify_account.py, check_chain.py
                         evidence probes (venv: .venv)
- DEVLOG.md, FRICTION.md, RESULT.md
