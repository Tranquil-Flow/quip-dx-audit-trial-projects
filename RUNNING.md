# Running v4-d

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python (scripts).

Python modules imported (pip names may differ): `web3`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

- Wallet file: ./keys/wallet.key (owner / EOA), ./keys/wallet2.key (recipient throwaway)
- Owner: 0x050cBa620d21F77560BA99824C0c3B39Bf78AA46
- Recipient: 0x54eE40EFC8DeCB05dab56FE988dC6100E99A9657
- Quip account: 0x4d4EB36078326d714b798fE3ca68e708CbB9d13b
- Quip vault ID: 0x001b1dbdfc891fcce7c39ca2f2c1ea369af4104e147759f015e25781f458ac1f
- Quip web app URL pattern: https://account.quip.network/accounts/<vaultId>:v1.1

To reproduce:
1. `qb start web-e2a8f8 --wallet ./keys/wallet.key --chain 84532`
2. Open https://account.quip.network and click the chat bubble
3. Connect wallet, choose Base Sepolia, pick v1.1 wallet version
4. Generate or type a 64-hex-char passphrase (saved to ./.quip-passphrase)
5. Accept the two checkboxes and confirm
6. The wallet signs the account-creation transaction; the QuipFactory deploys your Quip account at the deterministic address derived from (owner, vaultId, factory, library)
7. Send 0.001+ ETH from the owner EOA to the new Quip account address to fund it
8. Use the Send button in the dashboard — the wallet signs the authorization, and the Quip account submits a userop on Base Sepolia

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)
- Base Sepolia (84532)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 2 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
