# p4-a

- **Round:** Round 5
- **Model:** Claude Sonnet 5.5
- **Task:** Hobbyist (Mac): run a testnet node and miner, then clean up
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Hobbyist (Mac): run a testnet node and miner, then clean up | Claude Sonnet 5.5 | nodes.quip.network compose, quip-validator, quip-miner | Partly working: validator and miner ran, but the validator had synced only to about block 13,000 of about 478,000 and the miner produced no proofs | 50 min | Stale config template, macOS PUID/PGID crash loop, hardcoded names and ports [C-NOD-01, C-T05-01, C-NOD-03, C-T05-04, C-T05-03]. Not rebuilt (needs Docker nodes and a full sync); checked from its logs and chain state. |

## Trial card

- **Model:** Claude Sonnet 5.5.
- **What it does:** A `sed`-edited copy of the official `nodes.quip.network` compose file (containers renamed, ports remapped, data under `./nodes/data`, as the brief asked) running a CPU-profile Aglais validator, miner coordinator and dashboard on macOS. The validator connected to 7 peers and had synced to about block 13,248 of about 478,000 when the session stopped; the miner was waiting for sync and produced no proofs. The containers were removed afterwards.
- **Quip products and integration:** `nodes.quip.network` compose — NATIVE; `quip-validator` (`quip-network-node`) — NATIVE; `quip-miner` coordinator 0.3.5-rc9 — NATIVE; the developer docs' node pages.
- **Evidence:** No transactions, addresses or proofs were claimed. The builder's logs quote the chain specification "AGLS (Quip Testnet)" and the sync targets, which fit the live chain height of about block 491,600 at the time of checking, and no containers were left running. The write-up says honestly that no mining proof was produced. Not rebuilt (it needs Docker nodes and a full chain sync).
- **Time:** 50 min.
- **What got in the way:** README setup step 1, `cp data/config.cpu.toml data/config.toml`, produces a config the miner rejects with "missing [miner] section" [[C-NOD-01](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/README.md#L233-L239)]. The README's PUID/PGID step crash-loops the validator on macOS because group id 20 already exists [[C-T05-01](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/README.md#L257)]. The compose file hardcodes container names, ports and volumes [[C-NOD-03](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/docker-compose.yml#L199), [C-T05-04](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/docker-compose.yml#L220-L221)], and the dashboard's bind-mount `chown` loops on Docker Desktop [[C-T05-03](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/docker-compose.yml#L351)]. The seeded miner config ships the placeholder `public_host = "203.0.113.10"`; only a comment in the config says to change it, and the README does not mention it [[C-NOD-10](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/config/quip-miner.toml#L60-L67)]. The README says the first sync "takes hours", but the Run a Node page, the entry point, does not [[C-NOD-17](https://developers.quip.network/docs/nodes/miners)].
