# TipJar on Quip Aglais testnet

Tip native AGLS (and optionally an ERC-20 through an injected EVM wallet). Solidity `TipJar` and its ERC-20 allowance/pull/withdraw behavior are unchanged. A separate, **testnet-demo-only** smart account accepts Quip SHRINCS post-quantum signatures, letting a gas-paying EOA relay tips whose actual `msg.sender` is the PQ account. This is **not** Quip's official Quip Account/extension: its factory and verifier are not deployed on Aglais and the published SDK rejects chain 20033. See `PORTING.md` and `RESULT.md` before using it.

Public testnet configuration: EVM RPC `https://evm-rpc.aglais.quip.network`, chain ID `20033` (`0x4e41`), native EVM denomination AGLS (18 decimals). Testnet tokens have no value. `web/deployment.json` holds the TipJar address. The separate public account/verifier addresses are recorded in `RESULT.md`; throwaway secrets/state are only in ignored `./keys`.

## Test

From the project root:

    forge test -vv
    node --check web/app.js

## Use the already deployed demo

    npm install --ignore-scripts
    forge build
    sh scripts/setup-verifier.sh
    node scripts/serve.mjs

Open `http://127.0.0.1:8000`. Choose **Use local Quip PQ account**, enter a creator address and up to `0.005` AGLS, and tip. The server is bound to localhost and serves same-origin requests only; it reads the project-local seed and throws a transaction through a separate gas-only EOA. It serializes requests. It MUST NOT be exposed to the network, run as a production service, or used with valuable keys. No browser extension or external wallet keys are read in PQ mode. The server requires the original `./keys` files; those files are not included if the project is copied without them. The `Tipped` event and receipt identify the PQ account as tipper.

Alternatively use the CLI from the project root (still only the keys in `./keys`):

    node scripts/pq-tip.mjs --creator 0x9aB381502b79996eD761866AB32d1ae82235fb1F --amount 0.0001 --message "hello"

The CLI burns each one-time signature leaf in `keys/pq-leaves.json` **before** signing. Never reset/restore this file to an older state, retry a burned leaf after a failed broadcast, or run two signing processes concurrently. This demo has a 16-leaf fixed bundle and **no rotation/recovery implementation**. Stop using it before the budget runs out. The script refuses further signing after leaf 16. For another user/key, create a *new account* with new keys and a new leaf-state file; do not copy the demo seed or key files.

To use an ordinary injected EVM wallet instead, choose **Connect injected EVM wallet**. The frontend offers to add/switch to Aglais; approval and ERC-20 tips use the original ethers v6 flow. A wallet's EVM address is NOT evidence of PQ authorization; only the local PQ mode verifies Quip SHRINCS on-chain in this demo. Recent tips are read from the public Aglais RPC.

## Recreate on Aglais with new throwaway keys

All of the following are TESTNET only. Never pass an existing private key/keystore or use mainnet. Do not print or paste secrets. Commands below operate from the project root:

    npm install --ignore-scripts
    forge test && forge build
    node scripts/create-keys.mjs

`create-keys.mjs` fails rather than overwriting existing files; it prints *public addresses only*. Request free test tokens for the **new deployer address shown** (faucet expects an EVM 0x address; POST from shell, not browser):

    curl -H 'content-type: application/json' -d '{"dest":"YOUR_NEW_DEPLOYER_0x_ADDRESS"}' https://faucet.aglais.quip.network/request

Wait for balance to arrive, then:

    node scripts/deploy.mjs
    sh scripts/setup-verifier.sh
    node scripts/deploy-pq.mjs
    node scripts/pq-tip.mjs --creator YOUR_CREATOR_0x_ADDRESS --amount 0.0001 --message "testnet tip"
    node scripts/serve.mjs

`deploy.mjs` checks the Substrate genesis and EVM chain ID before signing, deploys TipJar and writes its public address to `web/deployment.json`. `setup-verifier.sh` clones Quip's **AGPL-3.0-or-later** hashsigs-solidity source *inside the project*, pins commit `90df8e9ba79ee6964ebd03b6ac04d1435978ec3d`, removes two warning-code names unsupported by this Foundry version in that local clone, and compiles the 256s Keccak verifier with the upstream production Foundry profile. The clone and its dependencies are ignored in `.gitignore`. `deploy-pq.mjs` deploys the public verifier and demo PQ account using only locally created keys; the account address is stored in `keys/pq-deployment.json`. Native AGLS is needed both for gas in the throwaway EOA and for value in the PQ account (the tip script funds it from the EOA once). After deployment, use the localhost UI above. Deployment, signatures and call gas on Aglais may be far larger than familiar Ethereum estimates.

`TipJar.withdrawEth()` / `withdrawToken(token)` remain callable by the creator address; the creator must pay gas itself to withdraw (the script's creator key is a separate new throwaway key). The demo PQ account's general `execute` can authorize token approvals and transfers with Quip SHRINCS, but the provided PQ UI/CLI **only supports native AGLS tipping**; optional ERC-20 UI fields are for an injected wallet.

## Safety and limitations

The demo account is a short proof of integration, NOT a production wallet: no key rotation or stateless recovery, and `keys/pq-leaves.json` is only protected by single-process serialization in the local server, not a cross-process lock. Its verifier is from a public Quip source commit, but not a canonical vendor deployment on Aglais. Its relayer EOA cannot fake a PQ signature. Secure the seed and the one-time-leaf file, avoid concurrent CLI/server writers, and never fund the demo with value. You may delete `./keys` when done (after which the account cannot be operated). Do not reuse any keys on a mainnet. The older failed experiments and their on-chain addresses are documented in `DEVLOG.md`; they were not funded.
