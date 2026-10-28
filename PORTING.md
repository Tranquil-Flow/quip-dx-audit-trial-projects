# Porting TipJar from Base Sepolia to Quip Network (Aglais testnet)

## Target

Quip's testnet is **Aglais** (`quip-testnet`). It is a Substrate chain with a second, EVM-compatible front door:

| | |
|---|---|
| EVM JSON-RPC | `https://evm-rpc.aglais.quip.network:20049` (HTTP only) |
| Chain id | 20033 (`0x4e41`) |
| Gas token | AGLS: 18 decimals on the EVM side, 12 on the Substrate side |
| EVM backend | `pallet-revive` (node reports `eth-rpc/HEAD-f17113f`) |
| Explorer | https://explorer.aglais.quip.network (Blockscout) |
| Faucet | `POST https://faucet.aglais.quip.network/request {"dest": "0x…"}`, 10 AGLS per request |

These details are only on the testnet landing page, https://aglais.quip.network. The developer docs (developers.quip.network) never mention the EVM RPC or the chain id.

"Tip from a Quip post-quantum account" means a **Quip Account**: an ERC-4337-style smart-contract wallet (`ShrincsWallet`) whose actions are authorized by SHRINCS hash-based one-time signatures. The classical owner key only submits the transaction and pays gas.

## What changed and why

### Contract (`src/TipJar.sol`): no changes
The unmodified solc 0.8.24 / `cancun` bytecode deployed and runs on pallet-revive. I didn't need resolc or a PolkaVM recompile, and I didn't change the Solidity. `forge test` still passes 5/5. ETH semantics carry over as AGLS (`msg.value`, `call{value:}`).

### Deployment: `forge script` → `cast send --create`
`forge script script/Deploy.s.sol --broadcast` fails with `error code 1010: Invalid Transaction` and then `1012: Transaction is temporarily banned`. forge sets the gas limit from its local EVM simulation (1,201,337 gas). pallet-revive folds weight and storage deposit into "gas", and the node's own `eth_estimateGas` for the same deployment is **336,975,106**, about 280× higher. The tx is rejected at pool validation. `--skip-simulation` then timed out against the slow RPC. `cast send --create <bytecode>` lets the node estimate gas, and that deploy succeeded. `script/Deploy.s.sol` is untouched but no longer the documented path. The README now documents the `cast` command, and `foundry.toml` gained an `aglais` RPC alias.

### Keystore location
The README's `cast wallet import deployer --interactive` writes to `~/.foundry/keystores`. The README now uses `-k ../keys`, which keeps the keystore in the project.

### Frontend (`web/app.js`, `web/index.html`)
- `TIPJAR_ADDRESS` set to the Aglais deployment, and `CHAIN_ID` changed from 84532 to 20033.
- `wallet_switchEthereumChain` now falls back to `wallet_addEthereumChain` on error 4902. MetaMask etc. have Base Sepolia built in but don't know Aglais, so the original code would just throw.
- Display labels changed from "ETH" to "AGLS".
- Nothing else changed. The read path (`queryFilter` over the last 5000 blocks via `eth_getLogs`) and the write path (`Contract.tip` + `tx.wait()`) both work unchanged. I checked both from Node with ethers 6.13.4 (`quip-client/readcheck.mjs`, `quip-client/ethers-eoa-tip.mjs`). I did not test it in a real browser wallet.

### New: tipping from a Quip post-quantum account (`quip-client/`)
This part could not be a small change because **Quip has no account infrastructure on its own testnet.** On Aglais, `eth_getCode` is empty for the canonical WalletFactory, SHRINCS wallet implementation, verifier, paymaster, ERC-4337 EntryPoint v0.7, CreateX, Multicall3 and the CREATE2 deployer. The published SDK (`@quip.network/ethereum-sdk@beta` = 0.3.0-beta.8) hard-codes a chain allowlist that leaves out 20033. So I:

1. Built the SHRINCS contracts from Quip's canonical GitLab repo (`quip.network/ethereum-sdk`, branch `v1.0.0-rc.2`; the GitHub `main` and `deploy/testnet` branches are stale and predate SHRINCS). Their ABIs match the npm SDK's ABIs selector-for-selector.
2. Deployed my own stack with plain CREATE (`quip-client/deploy-quip-stack.sh`): the SHRINCS256sKeccak verifier, WalletFactory (an ERC1967 proxy whose owner is my throwaway deployer), and the ShrincsWallet implementation, then vetted the implementation on the factory.
3. Used the **published SDK** unchanged. I passed `factoryAddress`/`walletImplementation` overrides to `ShrincsFactoryClient`, created a SHRINCS account from a fresh BIP-39 mnemonic (QUIP HD path, budget of 16 one-time signatures), and called the wallet's **direct owner path** `execute(publicKey, shrincsSig, TipJar, value, tip(...), maxFee)`. That path skips the ERC-4337 EntryPoint and bundler, which Aglais doesn't have. TipJar sees the Quip account as `msg.sender`, so the `Tipped` event's `tipper` is the post-quantum account.
4. Added a small EIP-1193 shim in `tip.mjs`. The SDK passes `account` to viem as a bare address, so viem sends `eth_sendTransaction`, which expects an injected wallet. The shim signs those locally with the owner key.

The web frontend still tips from whatever injected wallet is connected. Quip's browser extension and https://account.quip.network would be the natural way to tip from a Quip account in the UI, but they are built on the same SDK allowlist. They can't know about my self-deployed Aglais factory, so the post-quantum path is a Node CLI for now.

## Expected to work unchanged, but didn't

| Expected | What happened |
|---|---|
| `forge script … --broadcast` deploys as on any EVM chain | Gas limit from forge's local simulation is ~280× too low under pallet-revive → `1010 Invalid Transaction`. Had to use `cast send --create`. |
| Quip accounts are "on the chain you already use", so they'd surely be on Quip's own chain | No Quip account contracts, no EntryPoint, no CreateX on Aglais. Had to build and deploy the stack myself. |
| `@quip.network/ethereum-sdk` works for any EVM chain id | Chain allowlist excludes 20033 (`UnsupportedNetworkError`). It works only with explicit address overrides. |
| SDK works with a viem local-account wallet client (normal in Node) | It sends `eth_sendTransaction` with a bare address (`Account not found`). Needed a local-signing EIP-1193 shim. |
| `wallet_switchEthereumChain` is enough, as on Base Sepolia | Wallets don't know chain 20033, so I added `wallet_addEthereumChain`. |
| Building Quip's contracts with `forge soldeer install` | The hashsigs-solidity dependency is pinned to an SSH git URL (`git@gitlab.com:…`), which fails without GitLab SSH keys. I fetched the pinned rev as an HTTPS tarball. |
| Faucet balance equals the drip | The EVM side reads 9.999 AGLS for a 10 AGLS drip (one existential deposit low, as the testnet page says). |
| Standard RPC surface | `eth_newFilter` returns `-32601 Method not found` (no filters or pubsub), and `eth_feeHistory` with an integer block count returns `-32602`. The public RPC sometimes takes ~10 s or times out. `eth_getLogs` works. |

## Gas costs observed (gas price 1 gwei)

| Action | gasUsed |
|---|---|
| TipJar deploy | 336,972,004 (~0.34 AGLS) |
| EOA tip via ethers | 2,046,504 |
| Tip from Quip account (SHRINCS verify + call) | 20,044,150 (~0.02 AGLS) |
