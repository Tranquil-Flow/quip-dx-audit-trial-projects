# x1-a

- **Round:** Round 5
- **Model:** Claude Sonnet 5.5
- **Task:** Node and miner on a shared Linux server (Docker, ops runbook)
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Node and miner on a shared Linux server (Docker, ops runbook) | Claude Sonnet 5.5 | quip-validator and quip-miner images, Aglais faucet | Built and working on testnet: node synced and miner registered and running; no proofs submitted yet | 24 min | The miner entrypoint ignores PUID/PGID and chowns the whole data mount; fixed names and ports; stale config template [C-OS-01, C-NOD-03, C-T05-04, C-NOD-01, C-NOD-10, C-T05-02]. Not rebuilt (needs Docker nodes and a full sync); miner registration checked on chain. |

## Trial card

- **Model:** Claude Sonnet 5.5.
- **What it does:** On a Linux server, its own `docker-compose` project (not the vendor file) running the vendor validator and CPU miner on Aglais with loopback-only ports and data under `./data`, plus an ops runbook; left stopped. The validator synced and the miner registered and ran, but it had submitted no proofs when the write-up was finished, which the write-up says.
- **Quip products and integration:** `quip-validator` and `quip-miner` `:beta` images — NATIVE; Aglais faucet (the miner funds itself) — NATIVE.
- **Evidence:** The Aglais chain reports runtime 118 and the chain name AGLS. The miner account 0x43dcfd25444250421fd37f41fed3b9e20af48d4c647b050856314c0ec41a76f9 appears in extrinsics in blocks 488245 to 488248, next to the claimed registration block (the write-up's block number is off by one). The mining claim rests on `is_mining` true, `results_validated` rising from 10 to 35 and about 200% CPU; `proofs_submitted` is 0, as stated. Not rebuilt (it needs Docker nodes and a full chain sync).
- **Time:** 24 min.
- **Key Quip call** (`docker-compose.yml:8, 24-25, 27-29`, excerpt):
```yaml
image: registry.gitlab.com/quip.network/quip-validator/quip-network-node:beta
...
  - --chain=/etc/quip/chain-spec.json
  - --base-path=/data
...
  - --validator
  - --state-pruning=archive
  - --blocks-pruning=archive
```
- **What got in the way:** The miner's entrypoint ignores PUID and PGID and always runs `chown -R quip:quip` on the whole data mount, although the README says the node chowns `/data` to match them; the builder could not move the keystore or delete a data directory without `sudo` [[C-OS-01](https://gitlab.com/quip.network/quip-miner/-/blob/d58a7c79826c22b9bc071850a8f3bb453dd186b5/docker/entrypoint.sh#L32)]. The vendor compose file hardcodes container names and host ports, so the builder wrote its own [[C-NOD-03](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/docker-compose.yml#L199), [C-T05-04](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/docker-compose.yml#L220-L221)]. The README's config template is the retired v0.1 schema and the seeded config ships `public_host = "203.0.113.10"`; a config without `[miner].public_host` made the miner exit [[C-NOD-01](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/README.md#L233-L239), [C-NOD-10](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/config/quip-miner.toml#L60-L67)]. The entrypoint ignores the `signer_key` setting: the keystore is `/data/keystore.json` unless the `QUIP_SIGNER_KEY` environment variable is set [[C-T05-02](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/config/quip-miner.toml#L54-L59)]. The README's topology facts are stale against the live runtime 118 [[C-NOD-06](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/README.md#L423)]. The Run a Node page recommends opening port 20049, but the validator needs 30333 over TCP and UDP [[C-NOD-08](https://developers.quip.network/llms.txt#:~:text=Hardware%20requirements%20and%20install%20routes)]. The GitBook run-a-node URL returns 404 [[C-AGT-01](https://quip.gitbook.io/docs)].
