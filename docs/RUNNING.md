# Getting a project running again

Each `trial/<id>` branch has a `RUNNING.md` generated from what is in that branch, plus the builder's own run steps where they wrote any. This page is the part that is the same for all of them.

## The short version

1. **Check out a branch** and read `TRIAL.md` (what it built and what evidence it left), `RUNNING.md`, then the builder's `RESULT.md` and `DEVLOG.md`.
2. **Install** with the command in `RUNNING.md` section 1.
3. **Create your own test accounts.** Never use a mainnet account or real funds.
   - Many projects ship a generator (look for `wallet:new`, `gen-keys`, `keygen` in `RUNNING.md` or `package.json`).
   - Otherwise create the key file at the path listed in `RUNNING.md` section 3, in the format the reading script expects.
4. **Fund them from a testnet faucet.** Aglais has its own faucet; Base Sepolia and OP Sepolia need a third-party faucet. Get current links and endpoints from <https://developers.quip.network/llms.txt>.
5. **Run the builder's steps**, then compare the outcome with the Evidence section of `TRIAL.md`. Transaction hashes will differ; the behaviour should match.

For several projects the builder wrote a "check the existing deployment without a key" path first (read-only commands). That is the safest place to start.

## Things that commonly trip people up (as of the audit, Sep-Oct 2026)

- The `latest` npm tag of several `@quip.network` packages was stale. Use the version the project pins; for `hashsigs-wasm` that was the `rc` tag (0.2.1-rc9 at the time).
- Quip's Account contracts were not deployed on Aglais, so several projects deploy their own copy.
- Deploying EVM contracts on Aglais used hundreds of millions of gas units (the storage deposit is counted in gas). `forge script --broadcast` could fail with `1010 Invalid Transaction` because forge estimates gas too low; `cast send --create` worked.
- `quip-signer` and `xqffi` had Linux wheels only, so on macOS they compile from source (about 11 minutes).
- `xqsa` keeps its default keystore at `~/.quip/keystore.json`, outside the project folder.
- Inclusion on Aglais was sometimes slow. A transaction that seems stuck may still land later.

The audit report has the full list and what Quip could change.

## Project table

Stack and what to expect, per trial. "Builder steps" means the branch's `RUNNING.md` includes the builder's own run instructions. "Needs key files" means the code reads key files that were not published.

| Trial | Stack | Builder steps | Needs key files | Networks |
|---|---|---|---|---|
| [`h1-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/h1-a) | Node.js | no | check | - |
| [`h1-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/h1-b) | Node.js | yes | check | - |
| [`h2-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/h2-a) | Foundry (Solidity) | yes | check | Aglais testnet |
| [`h2-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/h2-b) | Foundry (Solidity) | yes | check | Aglais testnet |
| [`h3-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/h3-a) | Python (scripts) | yes | yes | Aglais testnet |
| [`h3-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/h3-b) | Python (scripts) | yes | yes | Aglais testnet |
| [`h4-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/h4-a) | documents/scripts | no | check | - |
| [`h5-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/h5-a) | Node.js, Python (scripts) | no | yes | Aglais testnet; local Anvil / fork; Solana devnet |
| [`h5-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/h5-b) | Python (scripts) | no | yes | Aglais testnet |
| [`h6-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/h6-a) | Python (scripts) | yes | check | - |
| [`h6-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/h6-b) | Node.js | yes | yes | Solana devnet |
| [`m1-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m1-a) | Node.js | yes | yes | Base Sepolia; Aglais testnet; local Anvil / fork |
| [`m1-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m1-b) | Node.js | yes | yes | Solana devnet |
| [`m1-c`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m1-c) | Node.js | no | yes | Aglais testnet; Base Sepolia |
| [`m2-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m2-a) | Node.js, Foundry (Solidity) | yes | yes | Base Sepolia; local Anvil / fork; OP Sepolia |
| [`m2-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m2-b) | Node.js, Foundry (Solidity) | yes | check | Base Sepolia; local Anvil / fork |
| [`m2-c`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m2-c) | Node.js, Foundry (Solidity) | yes | yes | local Anvil / fork |
| [`m3-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m3-a) | Foundry (Solidity), Python (scripts) | yes | yes | Aglais testnet |
| [`m3-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m3-b) | Node.js, Foundry (Solidity), Python | yes | check | Aglais testnet |
| [`m3-c`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m3-c) | Python (scripts) | yes | check | Aglais testnet |
| [`m4-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m4-a) | Node.js, Foundry (Solidity) | yes | yes | Aglais testnet |
| [`m4-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m4-b) | Node.js, Python (scripts) | yes | yes | Aglais testnet |
| [`m5-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m5-a) | Node.js | yes | check | Base Sepolia; local Anvil / fork; Aglais testnet |
| [`m5-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/m5-b) | Node.js | no | yes | Base Sepolia |
| [`t01-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t01-a) | Node.js | yes | yes | - |
| [`t01-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t01-b) | Node.js | yes | check | Solana devnet |
| [`t01-c`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t01-c) | Node.js | no | check | - |
| [`t02-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t02-a) | Node.js | yes | yes | Aglais testnet; Base Sepolia; OP Sepolia |
| [`t02-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t02-b) | Python (scripts) | yes | check | Aglais testnet |
| [`t02-c`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t02-c) | Node.js | yes | check | Base Sepolia |
| [`t03-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t03-a) | Node.js | yes | check | Base Sepolia; local Anvil / fork |
| [`t03-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t03-b) | Node.js | no | check | - |
| [`t03-c`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t03-c) | Node.js | no | check | Base Sepolia |
| [`t04-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t04-a) | Python (scripts) | no | yes | Aglais testnet |
| [`t04-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t04-b) | Python (scripts) | yes | yes | Aglais testnet |
| [`t04-c`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t04-c) | Python | yes | yes | Aglais testnet |
| [`t05-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t05-a) | documents/scripts | yes | check | Aglais testnet |
| [`t05-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t05-b) | Docker Compose | yes | check | Aglais testnet |
| [`t06-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t06-a) | Foundry (Solidity) | yes | check | Aglais testnet |
| [`t06-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t06-b) | Node.js | yes | check | Aglais testnet |
| [`t06-c`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t06-c) | Node.js, Hardhat | yes | check | - |
| [`t07-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t07-a) | Node.js, Foundry (Solidity) | yes | yes | Aglais testnet |
| [`t07-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t07-b) | Node.js, Foundry (Solidity), Python (scripts) | yes | yes | Aglais testnet |
| [`t07-c`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t07-c) | Node.js, Foundry (Solidity) | yes | yes | Aglais testnet |
| [`t08-a`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t08-a) | Node.js | yes | yes | Aglais testnet |
| [`t08-b`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t08-b) | Node.js | no | check | - |
| [`t08-c`](https://github.com/Tranquil-Flow/quip-dx-audit-trial-projects/tree/trial/t08-c) | Node.js | yes | check | - |
