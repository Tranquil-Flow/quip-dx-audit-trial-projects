# Quip SDK

Quip Network publishes two SDKs:

1. An SDK for quantum smart contracts and hybrid solvers, that helps you construct solutions for optimization and satisfiability problems, artificial intelligence tasks, or even Bitcoin mining.

This SDK is meant to help you work with quantum computers of all kinds: adiabatic quantum computers like annealers, or gate-based quantum computers that support certain operations which make it easier to reason about generalized quantum computation.

2. An SDK for existing smart contracts that lets you upgrade your contracts one ABI at a time. Import the file with your package manager and reference the SDK anytime you need to unwrap a post-quantum commitment into its associated classical public key.

The wallet SDK is compatible with WalletConnect, Solana `wallet-adapter`, and other major cryptocurrency wallet clients. Its most versatile use case is a smart account much like a Coinbase smart account or a Safe wallet, which wraps any contract with a post-quantum signature read and aborts the subsequent contract call if the read fails.

However, sometimes contracts may require token allowances, specialized permissions, or access to collateral held in the contract. For these use cases, it is necessary for the contract to implement the Quip SDK's post-quantum ABI extension directly.

## Install

The packages below are published in the public registries. Pre-release npm packages use the named distribution tags so the install command continues to select the current build in that release channel.

### JavaScript and TypeScript (npm)

> **Warning**
> Install with the tags shown below. A plain `npm install` resolves the `latest` tag, which for these packages points at builds from 2025 that predate the current signature scheme.

| Package | Install | What it is |
| --- | --- | --- |
| `@quip.network/ethereum-sdk` | `npm install @quip.network/ethereum-sdk@beta` | The account client for EVM chains. Use the `beta` tag for the current generation; `latest` still points to the earlier generation. |
| `@quip.network/hashsigs-wasm` | `npm install @quip.network/hashsigs-wasm@rc` | The current hash-based signature signer and verifier (SHRINCS), compiled from the audited Rust implementation to WebAssembly. Works in Node.js and the browser. Use the `rc` tag; `latest` points to an earlier release candidate. |

### Python (PyPI)

| Package | Install | What it is |
| --- | --- | --- |
| `xquad` | `pip install xquad` | Builds optimization models in the network's Ising format. |
| `xqsa` | `pip install xqsa` | Solver adapters for those models, including the backend that submits jobs to Quip Network. See [Submit Your First Compute Job](/docs/compute/submit-a-job). |

### Packages that do not exist yet

There is no public `@quip.network/quip-swap` or `@quip.network/sdk` package, and no swap SDK is published today. Use the wallet for swaps.

### Previous-generation libraries

The Winternitz One-Time Signature (WOTS+) libraries remain published for the earlier account generation: [`@quip.network/hashsigs`](https://www.npmjs.com/package/@quip.network/hashsigs) (TypeScript), [`@quip.network/hashsigs-solidity`](https://www.npmjs.com/package/@quip.network/hashsigs-solidity) (Solidity), [hashsigs-cpp](https://github.com/quipnetwork/hashsigs-cpp) (C++), and the [hashsigs-rs](https://crates.io/crates/hashsigs-rs) crate (Rust). New integrations should use the packages in the tables above.

Working with an AI assistant? Every page here has a markdown mirror and the site runs an MCP server: see [Use These Docs with AI](/docs/getting-started/use-with-ai).
