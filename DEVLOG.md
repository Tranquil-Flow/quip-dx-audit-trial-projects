# DEVLOG.md — Quip Network Hackathon Build

## Timeline

### 0:00 — Search for docs
- Searched "Quip Network developer docs" and "Quip Network blockchain SDK tutorial"
- Found main docs site: https://developers.quip.network/
- Found GitHub org: https://github.com/QuipNetwork
- Found npm packages: `@quip.network/ethereum-sdk`, `@quip.network/solana-sdk`, `@quip.network/hashsigs`

### 0:02 — Read Quickstart page
- URL: https://developers.quip.network/docs/getting-started/quickstart
- Two things you can do today: run a node, and generate quantum-resistant keys
- Libraries available: Rust (crates.io), C++, TypeScript (npm), Solidity
- Pointed to "Quip SDK" page and "Submit Your First Compute Job" page

### 0:03 — Read "Submit Your First Compute Job" page
- URL: https://developers.quip.network/docs/compute/submit-a-job
- Uses Python `xquad` and `xqsa` packages
- Ising model format for optimization problems
- CRITICAL NOTE: "Connection details for the public test network have not been published yet, so this page cannot include a node address."
- BLOCKED: Can't submit compute jobs without testnet RPC URL
- Local CPU solver (`SolverDWaveCPU`) works but requires Python 3.13+

### 0:05 — Read Quip SDK page
- URL: https://developers.quip.network/docs/getting-started/quip-sdk
- Two SDKs: (1) quantum smart contracts / hybrid solvers, (2) existing smart contracts upgrade
- Recommended packages:
  - `@quip.network/hashsigs-wasm@rc` — current hash-based signature signer/verifier (SHRINCS)
  - `@quip.network/ethereum-sdk@beta` — EVM account client
- Warning: "Install with the tags shown below. A plain npm install resolves the latest tag..."
- Previous-generation: `@quip.network/hashsigs` (WOTS+, legacy)

### 0:07 — Check npm package pages
- `@quip.network/hashsigs-wasm` — NO README on npm page (at time of search)
- `@quip.network/hashsigs` — has basic README but no usage examples
- Decided to check the GitHub repo for the WASM package

### 0:09 — Read hashsigs-rs GitHub repo
- URL: https://github.com/QuipNetwork/hashsigs-rs
- 11.2k stars, comprehensive Rust crate
- `ts/` directory contains the npm wrapper source
- Found `ts/README.md` with full API documentation!
- The README was NOT on npm but WAS in the repo

### 0:12 — Read ts/README.md (the actual API docs)
- Full API documented: loadHashSigs(), sphincsPlusC, shrincs
- SPHINCS+C: stateless, keygen → sign → verify
- SHRINCS: hybrid stateful + stateless, with key persistence
- Messages must be exactly 32 bytes
- Profiles: 256s-keccak (default), 256s-sha2, 128s variants

### 0:15 — Install and build
- `npm install @quip.network/hashsigs-wasm@rc` — installed in 2s
- Wrote demo.mjs covering SPHINCS+C, SHRINCS, key persistence, cross-profile
- First run failed: `shrincsImportSigningKey` not in top-level exports
- Fixed: it's returned from `loadHashSigs()`, not a named export
- Second run failed: messages must be exactly 32 bytes (ERR_BAD_LENGTH)
- Fixed: added pad32() helper
- Third run: SUCCESS — all sections pass

### 0:20 — Demo complete
- Total build time: ~20 minutes
- All cryptographic operations working locally
- No network connection needed
- Key files saved to `keys/shrincs-demo.key`
