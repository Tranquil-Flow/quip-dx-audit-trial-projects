# Counter on Quip Network (Aglais testnet)

A trivial Solidity `Counter` — `increment()`, `incrementBy(uint256)`, public `count` — deployed to
Quip Network's EVM-compatible testnet, with scripts to deploy it and to increment + read it back.

## Live deployment

| | |
|---|---|
| Network | Aglais Testnet (Quip Network) |
| Chain ID | 20033 (`0x4e41`) |
| RPC (HTTP) | `https://evm-rpc.aglais.quip.network:20049` |
| Native token | AGLS (18 decimals) |
| Explorer | https://explorer.aglais.quip.network |
| **Contract** | **`0x51ddad71d1a185ec51e2451e7da3267ccf976bf4`** |
| Deploy tx | `0x4b692fb8a5a2ff947f6f624ef625a3e9e76add8d3d837602af229befca9813ec` |
| Increment tx (2→3) | `0x0e0c317fc6ad731880344d23b8efc99f0584a034724456c9329bb06c0ee70a90` |

Contract page: https://explorer.aglais.quip.network/address/0x51ddad71d1a185ec51e2451e7da3267ccf976bf4

## Quickstart

```bash
# 1. throwaway testnet key (NEVER use a real wallet for this)
mkdir -p keys && chmod 700 keys
cast wallet new --json > /tmp/k.json
python3 -c "import json;d=json.load(open('/tmp/k.json'))[0];open('keys/deployer.json','w').write(json.dumps(d,indent=2))"
chmod 600 keys/deployer.json

# 2. fund it from the faucet (10 AGLS per request; must be run from a terminal)
ADDR=$(cast wallet address --private-key "$(python3 -c "import json;print(json.load(open('keys/deployer.json'))['private_key'])")")
curl -X POST https://faucet.aglais.quip.network/request \
  -H 'content-type: application/json' -d "{\"dest\":\"$ADDR\"}"

# 3. deploy
./scripts/deploy.sh

# 4. increment and read back
./scripts/increment.sh
```

Requires [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`).
Nothing else — no npm, no node_modules.

## The one non-obvious thing

**Deploying to this chain requires an enormous, deliberate gas limit, and `value` must be `0`.**

`pallet-revive` (the EVM backend behind this chain) charges a *storage deposit* for contract code and
its eth-rpc renders that deposit as **gas**. For this 607-byte Counter the true requirement is
~733,000,000 gas, even though the contract itself only executes ~177k gas of real work.

Every standard tool gets this wrong, because they estimate by simulating, and the simulation
under-reports badly. You get a *successfully mined transaction with `status: 0`* and no revert
reason:

| attempt | value | gas limit | outcome |
|---|---|---|---|
| `forge create` | 0 | auto (~3M) | mined, `status: 0` — `StorageDepositNotEnoughFunds` |
| `cast send` | 0 | 3M / 10M / 50M | mined, `status: 0` — same |
| `cast send` | 1 AGLS | 3M | mined, `status: 0` — `OutOfGas` |
| `cast send` | 1 AGLS | 50M / 800M | mined, `status: 0` — `execution reverted` |
| **`cast send`** | **0** | **800M** | **`status: 1` — deployed** |

So: **`--gas-limit 800000000 --value 0`**. The scripts in `scripts/` already do this.

Gotcha inside the gotcha: `cast run <failed tx>` reports *success*, because it re-executes the
transaction against a plain local EVM that has no notion of storage deposits. Do not trust it here.
The only place the real reason appears is:

```bash
curl -s -X POST https://evm-rpc.aglais.quip.network:20049 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"debug_traceTransaction",
       "params":["<failed tx hash>",{"tracer":"callTracer"}]}'
# -> {"error":"StorageDepositNotEnoughFunds", ...}
```

Calls to an existing contract are cheaper but still need headroom: the first `increment()` costs
~4.68M gas (it allocates a storage slot, another deposit), later ones ~2.04M. The scripts use a 30M
ceiling.

## Adding Aglais to MetaMask (end-user instructions)

1. Open MetaMask and click the **network selector** at the top-left of the wallet window.
2. Click **Add network** → **Add a network manually**.
3. Fill in these fields exactly:

   | Field | Value |
   |---|---|
   | Network name | `Aglais Testnet (Quip Network)` |
   | New RPC URL | `https://evm-rpc.aglais.quip.network:20049` |
   | Chain ID | `20033` |
   | Currency symbol | `AGLS` |
   | Block explorer URL | `https://explorer.aglais.quip.network` |

4. Click **Save**, then **Switch to Aglais Testnet (Quip Network)**.

Notes for the end user:

* Use the **HTTPS** RPC, not `wss://`. Quip's own testnet page says to add it "over an HTTP transport
  rather than WebSocket". MetaMask wants HTTP anyway.
* AGLS is the **native** gas token, so there is no token contract to "Import tokens" — your AGLS
  balance shows in MetaMask's main balance once funded.
* **Fund the account before doing anything.** Ask the faucet for testnet AGLS:
  open a terminal and run (the faucet deliberately rejects browser requests)
  ```bash
  curl -X POST https://faucet.aglais.quip.network/request \
    -H 'content-type: application/json' -d '{"dest":"0xYourMetaMaskAddress"}'
  ```
  It dispenses 10 AGLS, rate-limited per destination. Expect MetaMask to show slightly less than
  10 (e.g. 9.999) because the EVM balance reads one existential deposit low.
* **To interact with the deployed Counter**, use *Import account* in MetaMask with a throwaway
  testnet private key — do this in a **separate MetaMask profile / browser**, never in a wallet that
  holds real assets. Then use "Import tokens"? No — for a plain contract call there is no UI; use the
  scripts in `scripts/` or a tool like Remix connected via **Injected Provider**. The ABI is at
  `out-resolc/src_Counter_sol_Counter.abi` (and `out/Counter.sol/Counter.json`).
* Caveats on this network: there is **no pubsub (`eth_subscribe`) and no filter API
  (`eth_newFilter`)**, so dApps that rely on live event subscriptions will not work; use polling.
  Internal transactions and the gas tracker are also unavailable on the explorer.

## Repo layout

```
src/Counter.sol        the contract
scripts/env.sh         network constants + gas constants + key loading
scripts/deploy.sh      compiles and deploys; writes deployments/aglais.json
scripts/increment.sh   increments and reads count back (--by N, --read-only)
deployments/aglais.json  address + deploy tx hash
keys/deployer.json     THROWAWAY testnet key (not committed)
out-resolc/            evidence of a dead-end experiment (resolc/PolkaVM) — unused
DEVLOG.md              full session log: sources, commands, errors, wrong turns
RESULT.md              status, evidence, what didn't work, doc feedback
```

## Contract API

```solidity
uint256 public count;              // 0x06661abd
function increment() external;     // 0xd09de08a
function incrementBy(uint256);     // 0x03df179c
event Incremented(address indexed by, uint256 newValue);
```
