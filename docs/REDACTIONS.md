# What was removed, replaced or left alone

These projects were written by AI agents using throwaway test accounts. Before publishing, the copies were cleaned. This page says exactly what that means, so you know what you are looking at and what you will need to supply to run a project.

## 1. Not published at all

| What | Why |
|---|---|
| Key files and secret directories (`keys/`, keystores, `*.key`, `.env`) | These held the agents' test accounts. You will use your own (see [RUNNING.md](RUNNING.md)). |
| Dependency folders and build output (`node_modules`, `target`, `.venv`, caches, compiled output over 1 MB) | Reinstall from the lockfile. |
| Clones of Quip's public repositories that agents made (`nodes.quip.network`, `hashsigs-*`, `ethereum-sdk`, ...) and `vendor/` copies | Get these from Quip directly. |
| Files over 1 MB, binaries and archives, the agents' own `.git` histories, third-party PDFs | Size and redistribution. |

Every branch has an `EXCLUDED.md` listing what was left out of that branch.

## 2. Replaced

Only personal details of the person who ran the audit were replaced:

| Replacement | Stands for |
|---|---|
| `/Users/dev`, `dev` | the home path and username of the machine the agents ran on (this also appears in some Docker network names, e.g. `dev-quip`) |
| `[email]` | an email address |
| `[private-ip]`, `[remote-host]` | a private network address and a remote test host |
| `[REDACTED]` | the only two remaining are a signature from a public randomness beacon in `t08-a/research/` (`chains.json`, `qlatest.json`) that looked like a login token; it is not a credential |

## 3. Left exactly as the agents wrote them

Test-account values inside logs, evidence files, fixtures and notes were **kept**, including private keys, one-time signing material and secrets of swaps. They belong to throwaway accounts that only ever held testnet tokens (Aglais AGLS, Base Sepolia and OP Sepolia ETH from faucets).

An earlier cleanup pass had replaced some of these with `[REDACTED]`. That was reversed after checking the values:

- **990 distinct 64-hex values** that the cleanup had flagged were each turned into an EVM address and checked on Ethereum, Base, Optimism, Arbitrum, Polygon and BNB Chain mainnets.
- **977 had no balance and no transaction history on any of them**, and 4 are not valid private keys at all. The highest balance found anywhere was zero.
- **9** had transaction history, and all of those are public constants rather than anyone's key: the placeholder key `0x...01`, and constants from the Solady library in a verified contract (an event signature, the secp256k1 `n/2 + 1` constant, the DAI domain separator). Brain-wallet-style bots hold accounts at these values.
- Many of the flagged values were never secret at all: public seeds in signature fixtures, `secretHash` commitments, vault ids, account ids and policy digests. Removing them had broken the verification fixtures, so restoring them is also what lets those fixtures run.

**Do not reuse any key or secret from this repository for anything.** Treat all of it as public. The one-time (stateful) post-quantum signing keys in some projects are spent or testnet-only.

## 4. Why some things will not run as-is

- The original funded accounts are gone with the key files. A project that signs or deploys needs a fresh account of yours.
- Contract addresses and transaction hashes in the notes belong to the original runs. They are evidence of what happened, not state you can reuse.
- Quip's endpoints, faucets and package versions have moved since September 2026.

[RUNNING.md](RUNNING.md) covers how to get past all of that, and [AGENT_PROMPT.md](AGENT_PROMPT.md) is a ready-made prompt for having an AI agent do it.
