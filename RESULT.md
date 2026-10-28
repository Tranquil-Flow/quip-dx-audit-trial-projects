# RESULT

## Status: WORKING

The Solidity `Counter` was compiled, deployed to Quip Network's Aglais EVM testnet, incremented once, and read back as `1`. Both transactions have successful JSON-RPC receipts and are indexed as `ok` by Aglais Blockscout.

## Live deployment

| Item | Value |
|---|---|
| Network | Aglais Testnet (Quip Network) |
| Chain ID | `20033` (`0x4e41`) |
| RPC | `https://evm-rpc.aglais.quip.network:20049` |
| Deployer (throwaway) | `0xf2DE0655F31660A988F01619e12dF845c7180c59` |
| Contract | `0x9E81d0b542b759D8A23141ba92da0d71C025C13d` |
| Deployment block | `374903` |
| Increment block | `374907` |
| Final verified count | `1` |

Explorer links:

- Contract: https://explorer.aglais.quip.network/address/0x9E81d0b542b759D8A23141ba92da0d71C025C13d
- Deployment transaction: https://explorer.aglais.quip.network/tx/0x6cabc5376ca3aaea85ee7c818acff1130cefc727bcf45f7205f53b84435f8618
- Increment transaction: https://explorer.aglais.quip.network/tx/0x5b136fa215d2657030c4223c4a45b6c28482e3a9d0aa3dfa1c1aba4283b722c1

## Transaction evidence

### Faucet

- Faucet extrinsic hash: `0x482a1071c1c59e079419e2c87cb2faa70be065a32b4db1e9ac9fcebad07a9b1a`
- Faucet response: HTTP 200, amount `10000000000000` in the Substrate-side 12-decimal representation (10 test AGLS).

### Deployment

- Hash: `0x6cabc5376ca3aaea85ee7c818acff1130cefc727bcf45f7205f53b84435f8618`
- RPC receipt status: `1`
- Explorer API status: `ok`
- Created contract reported by explorer: `0x9E81d0b542b759D8A23141ba92da0d71C025C13d`
- Runtime bytecode observed through RPC: 150 bytes

### Increment and read-back

- Hash: `0x5b136fa215d2657030c4223c4a45b6c28482e3a9d0aa3dfa1c1aba4283b722c1`
- RPC receipt status: `1`
- Explorer API status: `ok`
- Script-observed transition: `0 → 1`
- Independent later `eth_call`: `count = 1`

Machine-readable evidence is in:

- `deployments/aglais.json`
- `evidence/verification.json`

There are no off-chain job IDs; this task used only the faucet extrinsic and EVM transactions listed above.

## How to run

To check the existing deployment without a key:

```sh
npm install
npm run compile
npm run verify:rpc
npm run read
npm run verify:evidence
```

To deploy with a new throwaway account, work in a clean copy where `keys/deployer.json` does not exist. The key generator deliberately refuses to remove or overwrite an existing key:

```sh
npm install
npm run wallet:new
npm run compile
# Fund the printed address only from the official valueless testnet faucet.
npm run deploy
npm run increment
npm run read
npm run verify:evidence
```

The exact faucet command and full safety notes are in `README.md`. End-user MetaMask instructions are in `METAMASK.md`.

## What did not work, limitations, and workarounds

- The first `eth_chainId` curl probe timed out after 20 seconds. Subsequent RPC probes and all deployment/interactions succeeded. The scripts rely on normal HTTP polling and will surface endpoint failures rather than hide them.
- Several DuckDuckGo searches timed out. Direct first-party pages and endpoints supplied the required data.
- `https://faucet.aglais.quip.network` returns 404 at its root; the documented POST endpoint `/request` worked.
- Generic extraction could not load the Blockscout root. Its v2 API worked and independently confirmed both transaction statuses and the created contract.
- The explorer recognizes the address as a contract but source is not explorer-verified. Source, ABI, compiler version, EVM target, and bytecode artifact are all present locally.
- npm reported four vulnerabilities in the small pinned dependency tree (1 low, 1 moderate, 2 high, 0 critical). No forced dependency rewrite was performed because that would reduce reproducibility. This code handles a valueless throwaway key only, but the dependency findings should still be reviewed before adapting it to anything valuable. Full audit output is in `npm-audit.json`.
- Quip's `pallet-revive` receipts report very high gas units (deployment used 727,364,444 gas). The transaction succeeded at the documented 1 gwei gas price. The script records the value as returned instead of normalizing or concealing it.
- The generated private key remains only in `keys/deployer.json`, mode 0600, and is git-ignored. It must never be reused or funded with real assets.

## What would make the vendor docs/tools easier

1. A dedicated EVM/Solidity quickstart in the developer docs. The official docs sitemap has no EVM deployment page; chain settings and faucet instructions currently live on the Aglais marketing/landing page.
2. Explicit `pallet-revive` compatibility guidance: supported Solidity versions/EVM targets, transaction envelope types, gas semantics/limits, JSON-RPC method matrix, and known ethers/Hardhat/Foundry configurations.
3. A copy-paste Counter deployment example and an official starter repository with chain-ID assertions and HTTP polling configured.
4. Documented Blockscout source-verification steps/API for Aglais.
5. Clearer faucet response documentation explaining its 12-decimal amount alongside the EVM-side 18-decimal balance, plus a direct explorer link for the returned Substrate extrinsic hash.
6. A machine-readable official chain configuration endpoint or an “Add to MetaMask” button backed by EIP-3085, reducing manual transcription risk.
7. RPC status/health information and retry recommendations; the endpoint had one transient timeout during initial probing.

For a chronological, candid record of commands, sources, errors, guesses, and deviations, see `DEVLOG.md`.
