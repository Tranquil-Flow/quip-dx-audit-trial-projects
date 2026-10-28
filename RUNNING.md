# Running v6-e

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Foundry (Solidity), Python (scripts).

```sh
forge build
```

Python modules imported (pip names may differ): `eth_account`, `web3`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

1. Install Foundry (one-time): `curl -L https://foundry.paradigm.xyz | bash && foundryup`
2. From this directory:
   ```bash
   forge build
   python3 scripts/loot_drop_demo.py
   ```
3. Optional: `python3 scripts/loot_drop_demo.py --reuse <contractAddr>` to skip deploy and run against a contract you deployed earlier.

The script will:
- Compile `LootDropV2.sol`
- Deploy it to Quip Aglais (chain 20033) using the throwaway key in `./keys/wallet.key`
- Call `openLoot()` from the same wallet (pays 0.001 AGLS = 1e15 wei)
- Generate the QVRF-style randomness off-chain (see "How the QVRF bridge works" below)
- Submit `rawFulfillRandomness()` on chain
- Submit `revealLoot()` and print the dropped item

The script prints every tx hash, contract address, and links to the Blockscout explorer so you can verify each step.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Environment variables the code reads: `QUIP_RPC`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 8 x deleted by the trial itself before it finished
- 1 x key material dir
- 1 x added by a later rebuild run, not part of the trial

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
