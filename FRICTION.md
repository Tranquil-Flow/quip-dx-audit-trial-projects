# FRICTION.md — confusion, misleading info, stuck moments

## 1. README Setup step contradicts the compose seed (stale template)
- URL: gitlab.com/quip.network/nodes.quip.network README.md, Setup step 1
- Quote: "cp data/config.cpu.toml data/config.toml"
- Expected: that template is what the current miner loads. Actually it still has
  the retired [global] schema; the compose file seeds the new [miner] schema from
  config/quip-miner.toml, and the v0.3 coordinator needs that. Cost: ~5 min
  cross-reading; a literal follower gets a broken first boot.

## 2. env.example names a public RPC hostname that doesn't exist
- Quote: "QUIP_VALIDATOR_RPC_URLS=wss://cpu-1.nodes.quip.network/rpc"
- Actually: NXDOMAIN. The working endpoints are the bootnode list in the same
  README's Aglais table. Cost: ~3 min probing all candidates.

## 3. Docker Compose override ports APPEND — remapping via override silently keeps stock ports
- docker-compose.override.yml ports merge with the base list; `config` showed
  20049/80/443 still published next to 31600-31602. On this shared machine that
  could collide with other services. Fix: edit base file directly. Cost: ~10 min.

## 4. Validator entrypoint crash-loops on host GID 20
- Error: "groupmod: GID '20' already exists" repeated; container restarts.
  Docs tell operators to seed PUID/PGID from id -u/id -g (macOS: 501/20) — that
  advice breaks the validator image (but not the miner image). Fix: pin
  PUID=1000/PGID=1000 for the validator service. Cost: ~15 min.

## 5. registry.gitlab.com flaky; pull_policy: always wedges `up`
- First pull: TLS handshake timeouts on all three images while gitlab.com worked.
  Later `up -d` hung ~5 min in the pull re-check. Fix: pull_policy: missing
  (images were already present/current locally). Cost: ~20 min total.

## 6. Miner entrypoint ignores the configured signer_key path
- config/quip-miner.toml says "The entrypoint generates a keystore at exactly
  this path on first run when the file is missing" (signer_key). Setting
  signer_key=/keys/keystore.json + mounting ./keys:/keys produced
  "cannot derive a signer from /keys/keystore.json: InvalidPath" while the
  entrypoint wrote /data/keystore.json anyway. The doc sentence is misleading:
  the path is fixed. Cost: ~10 min (revert + symlink workaround).

## 7. Public bootnode RPCs are not usable for the miner's snapshot reads
- The coordinator pins a block and calls a runtime state_call; bootnodes answer
  "UnknownBlock: Header was not found in the database" or "Request timeout".
  Nothing in the docs says the public RPC is not archive or is rate-limited —
  the README even suggests miner-only nodes point at public full nodes. The
  miner just retries forever with "cannot fetch mining snapshot; staging
  nothing". Cost: ~20 min of watching retries before concluding.

## 8. Runtime spec version moves during initial sync
- README explains this ("runtime quip/103 ... upgrade the validator" trap) but
  operators still have to discover WHERE the spec-118 upgrade block is. My local
  node at #13k still ran 117, so wiring the miner to it would fail preflight.
  No easy way to know when it's safe. Cost: ~5 min of queries + reasoning.

## 9. GitLab UI pages time out in a text extractor
- developers' links to gitlab.com repo/releases pages repeatedly timed out;
  worked around with the API + git clone. A browser user wouldn't hit this.
  Cost: ~4 min.

## 10. Two docs spellings of the public RPC (cosmetic but real)
- README Aglais table: wss://bootnode-1.aglais.quip.network:20049/rpc;
  env.example/dashboard section: wss://cpu-1.nodes.quip.network/rpc (dead, #2).
  Two schemes, one works. Cost: folded into #2.
