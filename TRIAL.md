# p4-b

- **Round:** Round 5
- **Model:** DeepSeek V4 Pro
- **Task:** Hobbyist (Mac): run a testnet node and miner, then clean up
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Hobbyist (Mac): run a testnet node and miner, then clean up | DeepSeek V4 Pro | nodes.quip.network compose, quip-miner, Aglais faucet | Partly working: the miner was funded and registered on chain, but no proof was produced and the validator was still near block 13,000 | 91 min | A README example RPC host with no DNS records; the same config, port and PUID problems [C-PER-01, C-NOD-01, C-NOD-03, C-T05-01, C-T05-02, C-NOD-17]. The write-up's self-rating "working" overclaims. Not rebuilt; registration checked on chain. |

## Trial card

- **Model:** DeepSeek V4 Pro.
- **What it does:** Ran the official `nodes.quip.network` compose on macOS (CPU profile) with renamed containers and remapped ports: a miner coordinator with `quip-cpu-sa`, an archive validator syncing from genesis, and the dashboard. The miner generated its own keystore, received 20 UNIT from the Aglais faucet and registered on chain as a miner. No proof was produced, and the validator was still near block 13,000 of about 478,000. Containers and volumes were torn down. Python probe scripts check the chain state.
- **Quip products and integration:** `nodes.quip.network` compose — NATIVE; `quip-miner` coordinator 0.3.5-rc9 with `quip-cpu-sa` — NATIVE; `quip-network-node` validator — NATIVE; Aglais faucet and the `QuantumPow` pallet — NATIVE.
- **Evidence:** We read the chain through the public bootnode RPC. The `QuantumPow.Miners` map has an entry for the miner account 0x23017f8b495c2b372d53f4d945107c17831e8e897df18262497d4b557bbec1c3, and that account has nonce 1 and about 18.999 UNIT free, as claimed (the missing 1 UNIT is the registration fee). The node log shows "registered this account as a miner on chain" and, throughout, "staging nothing"; no proof was staged or submitted. The final report's self-rating is "working", which overclaims: the registration, funding and balance claims check out, but no proof was ever produced and the validator was not synced. Its claim that the public bootnode RPCs are not archive nodes did not reproduce; the bootnode returns block hashes and runtime versions at old heights. Not rebuilt (it needs Docker nodes and a full chain sync).
- **Time:** 91 min.
- **Key Quip call** (`verify_account.py:23-24`, excerpt):
```python
mkey = "0x" + twox128("QuantumPow") + twox128("Miners") + blake2_128_concat(ACCOUNT)
r = await call("state_getStorage", [mkey])
```
- **What got in the way:** README setup step 1 copies a retired config schema [[C-NOD-01](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/README.md#L233-L239)]. README and `env.example` tell miner-only operators to set `QUIP_VALIDATOR_RPC_URLS=wss://cpu-1.nodes.quip.network/rpc`, a hostname with no DNS records; the working endpoints are the `bootnode-N.aglais.quip.network:20049` hosts listed elsewhere in the same README [[C-PER-01](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/README.md#L124)]. The compose file hardcodes ports, so a compose override that remaps them keeps the stock ones as well [[C-NOD-03](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/docker-compose.yml#L199), [C-T05-04](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/docker-compose.yml#L220-L221)]. The PUID/PGID step crash-loops the validator on macOS [[C-T05-01](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/README.md#L257)]. The `signer_key` comment says the entrypoint generates the keystore at the configured path, but it writes `/data/keystore.json` [[C-T05-02](https://gitlab.com/quip.network/nodes.quip.network/-/blob/14d99799832caf68747bd7f2beff4dad2d00f93e/config/quip-miner.toml#L54-L59)]. The miner's "cannot fetch mining snapshot; staging nothing" messages are not explained anywhere, and the Miners page says nothing about time to first proof [[C-NOD-17](https://developers.quip.network/docs/nodes/miners), [C-NOD-18](https://developers.quip.network/llms.txt#:~:text=Substrate%20JSON%2DRPC%3A%20https%3A//bootnode%2D1.aglais.quip.network%3A20049/rpc)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. `RESTORED.md` lists the files taken from the session log because the snapshot predates their last change. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
