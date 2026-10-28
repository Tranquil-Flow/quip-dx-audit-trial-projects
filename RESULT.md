# RESULT — Counter contract on Quip Network (Aglais) EVM testnet

**STATUS: WORKING**

A Solidity `Counter` (`increment()`, `incrementBy(uint256)`, public `count`) is deployed to Quip
Network's public EVM testnet, has been incremented three times, and reads back correctly via two
independent paths (Foundry and raw JSON-RPC). All three confirmed transactions are on-chain and
visible in the public explorer.

---

## 1. Network (as discovered, not as given)

| | |
|---|---|
| Network name | Aglais Testnet (Quip Network) |
| Chain ID | **20033** (`0x4e41`) |
| EVM JSON-RPC | `https://evm-rpc.aglais.quip.network:20049` |
| Native token | **AGLS**, 18 decimals on the EVM side (12 on the substrate side) |
| Gas price | 1 gwei, effectively fixed (`eth_gasPrice` → `0x3b9aca00`) |
| Explorer | https://explorer.aglais.quip.network (Blockscout) |
| Faucet | `POST https://faucet.aglais.quip.network/request` — 10 AGLS, terminal-only |
| EVM backend | `pallet-revive` (`web3_clientVersion` → `eth-rpc/HEAD-f17113f`) |

Verified against the live chain before use: `eth_chainId` → `0x4e41`, `net_version` → `20033`.

Important context: **Aglais is a relaunch.** The Quip testnet restarted from a fresh genesis on
2026-09-02 with runtime 117, transaction version 7 and the AGLS token. Anything written about an
older Quip testnet (different chain id, different faucet) is stale.

---

## 2. How to run what I built

Prereqs: [Foundry](https://book.getfoundry.sh/). Nothing else — no npm/node_modules.

```bash
cd /private/tmp/devtrials2/t06-deepseek-v4-flash

# --- one-time: throwaway testnet key ---
mkdir -p keys && chmod 700 keys
cast wallet new --json > /tmp/k.json
python3 -c "import json;d=json.load(open('/tmp/k.json'))[0];open('keys/deployer.json','w').write(json.dumps(d,indent=2))"
chmod 600 keys/deployer.json

# --- one-time: fund it (run from a terminal; the faucet rejects browser calls) ---
ADDR=$(cast wallet address --private-key "$(python3 -c "import json;print(json.load(open('keys/deployer.json'))['private_key'])")")
curl -X POST https://faucet.aglais.quip.network/request \
  -H 'content-type: application/json' -d "{\"dest\":\"$ADDR\"}"

# --- deploy (writes deployments/aglais.json) ---
./scripts/deploy.sh

# --- increment + read back ---
./scripts/increment.sh
./scripts/increment.sh --by 5      # optional: incrementBy(uint256)
./scripts/increment.sh --read-only # just read count()
```

Scripts: `scripts/env.sh` (constants), `scripts/deploy.sh`, `scripts/increment.sh`.
They contain the required gas recipe so nobody has to rediscover it.

---

## 3. Evidence

### Deployed contract
```
address  : 0x51ddad71d1a185ec51e2451e7da3267ccf976bf4
```

### Transactions (all `status: 1` / explorer `status=ok`)

| # | action | tx hash | block | gasUsed |
|---|---|---|---|---|
| 1 | deploy Counter | `0x4b692fb8a5a2ff947f6f624ef625a3e9e76add8d3d837602af229befca9813ec` | 374903 | 732,883,407 |
| 2 | `increment()` (0→1) | `0x5dc882ca1beb64ff58cac406780df48e380093b683b723e296d981712160df59` | 374907 | 4,678,170 |
| 3 | `increment()` (1→2) | `0x9b1cb68ae874822d6494b6396276028ea2ef0af22fe747363fd3b46b7a3964f6` | 374908 | 2,038,182 |
| 4 | `increment()` (2→3) | `0x0e0c317fc6ad731880344d23b8efc99f0584a034724456c9329bb06c0ee70a90` | 374913 | 2,038,182 |

### Deployer (throwaway, testnet-only)
```
address : 0x422b638Df9ec9A6085cdFb999C049ed11af5BA8e
key     : keys/deployer.json  (chmod 600, ./keys chmod 700, gitignored)
balance : 9,243,389,229,958,000,000 wei  (~9.243 AGLS, after gas spend)
funding : faucet extrinsic 0x7132f1cd3af3c6c22823a4fda80289962d640ecb6a2082d1f10ba95bea332cd1
```

The private key was generated fresh on this machine with `cast wallet new --json` and was verified by
re-deriving the address from it (`cast wallet address --private-key`). No pre-existing wallet on this
machine was read or used, and nothing was sent to mainnet.

### `scripts/increment.sh` output (real, verbatim)
```
Contract : 0x51ddad71d1a185ec51e2451e7da3267ccf976bf4
count()  : 2
==> Sending increment()
    tx: 0x0e0c317fc6ad731880344d23b8efc99f0584a034724456c9329bb06c0ee70a90
==> Waiting for receipt
    status=0x1 gasUsed=2038182
==> count() read back: 3

explorer: https://explorer.aglais.quip.network/tx/0x0e0c317fc6ad731880344d23b8efc99f0584a034724456c9329bb06c0ee70a90
OK: 2 -> 3
```

### Independent verification (not via Foundry)
```bash
# raw JSON-RPC read of count()
curl -s -X POST https://evm-rpc.aglais.quip.network:20049 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0x51ddad71d1a185ec51e2451e7da3267ccf976bf4","data":"0x06661abd"},"latest"]}'
# -> {"result":"0x0000000000000000000000000000000000000000000000000000000000000003"}   (= 3)

# code is present
eth_getCode -> 574 bytes

# Blockscout agrees
/api/v2/addresses/0x51ddad71d1a185ec51e2451e7da3267ccf976bf4
  -> is_contract: true, creation_status: "success",
     creator_address_hash: "0x422b638Df9ec9A6085cdFb999C049ed11af5BA8e",
     creation_transaction_hash: "0x4b692fb8a5a2ff947f6f624ef625a3e9e76add8d3d837602af229befca9813ec"
```

---

## 4. What did not work, and why

### 4.1 Standard deploy tooling silently fails (the main finding)

`forge create` and any default-simulation tool **will** produce a mined transaction with
`status: 0` and no revert reason. Root cause: `pallet-revive` charges a **storage deposit** for
contract code, and its eth-rpc expresses that deposit **as gas**. For this 607-byte contract the real
requirement is **~733,000,000 gas** (the node's own `eth_estimateGas` says `0x2baef5ed` =
732,491,757), even though the contract does only ~177k gas of actual work.

The error is only visible via debug tracing:
```
debug_traceTransaction(<failed tx>, {"tracer":"callTracer"})
  -> {"error":"StorageDepositNotEnoughFunds"}     # when value = 0
  -> {"error":"OutOfGas"} / {"error":"execution reverted"}   # when value > 0
```

Two counter-intuitive rules:
* **gas limit must be ≥ ~750M** — `forge create`'s auto-estimation (~3M) fails, and retrying at
  10M/50M fails identically, which makes it look like a non-gas problem.
* **`value` must be `0`.** Attaching value *breaks* the create (the deposit logic reverts). The
  working call is `--gas-limit 800000000 --value 0`.

Failed attempts, kept for the record (all explorer `status=error`):
```
0x23b092df9fed003c9cbe97030d1157f4ddd8aa71839576f8394c3ad93369afaa  value 0,  gas 3M   StorageDepositNotEnoughFunds
0x9347459212a9432002a11ea44bd7561ba156a51e7512f82b1304f8d6465464f4  value 0,  gas 10M  same
0x0247184f4e5ae28018c7a9e1d74b2fe04c2c082d31b8d0186410475b47e05578  value 0,  gas 50M  same
0x018dc3db19d85aa41472be86e1ae7a9372bde0055a8bed62bcac39a70fc8a66f  value 1e18, gas 3M  OutOfGas
0xa083912d94be886e14bdbade169e0b2e8623d1656bfefdcbf228389913a67fa6  value 1e18, gas 50M execution reverted
0xfb53a64f5933a0537cc808aa7f653e8cb8d81dc7ba926db872783125c4b2538e  value 1e18, gas 800M reverted
```

### 4.2 `cast run` lies on this chain
`cast run <failed tx>` re-executes against a **plain local EVM** with no storage-deposit concept and
reports success: `[114959] → new @0xD0B5A5… └─ [Return] 574 bytes of code`. That cost me real time —
it made "the bytecode is fine" look proven when the chain disagreed.

### 4.3 Wrong hypothesis: resolc / PolkaVM (dead end, ~15 min)
Because the backend is `pallet-revive`, I assumed stock solc EVM bytecode was rejected and that
Parity's `resolc` (Solidity → PolkaVM) was required. I installed `@parity/resolc` 1.4.0, compiled to
a 3525-byte PolkaVM blob (magic `PVM\0`), and submitted it — **it never got mined**, sat in the tx
pool, and blocked nonce 3 until I replaced it with a higher-gas-price transaction. This whole path
was unnecessary: the chain executes ordinary solc EVM bytecode. `out-resolc/` is left in the tree as
evidence; no shipped script uses it.

### 4.4 Tooling foot-guns encountered
* `forge create` reports only `Error: contract was not deployed` (and on retry,
  `error code 1013: Transaction Already Imported`) — no reason, no receipt.
* There is **no `txpool_*` RPC** (`txpool_status` → "Method not found"), so a stuck/pending tx cannot
  be inspected; I had to infer state from `cast nonce` plus the Blockscout API.
* `cast send --create <CODE> --rpc-url ...` fails with `unexpected argument '--rpc-url'` — flags must
  precede the positional code.
* `cast wallet new ./keys --json` does **not** print a key and does **not** write a usable keystore —
  it creates a 0-byte file. I removed it and used `cast wallet new --json` (stdout) instead.

### 4.5 Minor network quirks
* EVM balances read one existential deposit low: a 10 AGLS faucet drip shows as **9.999 AGLS**.
* No pubsub (`eth_subscribe`) and no filter API (`eth_newFilter`) — polling only. Documented by the
  vendor, but it will silently break event-subscription dApps in MetaMask-adjacent tooling.
* The same address looks different on the two explorers — the substrate account is the EVM address
  with `0xee…` padding appended:
  `0x422b638df9ec9a6085cdfb999c049ed11af5ba8eeeeeeeeeeeeeeeeeeeeeeeee`.
* This testnet is **nearly empty**: when I started, chain-wide there were **58 EVM transactions and
  43 addresses**, and **zero verified contracts**. There is no prior art on this chain for anything.

---

## 5. How an end user adds the network to MetaMask

1. MetaMask → network selector (top-left) → **Add network** → **Add a network manually**.
2. Enter:

   | Field | Value |
   |---|---|
   | Network name | `Aglais Testnet (Quip Network)` |
   | New RPC URL | `https://evm-rpc.aglais.quip.network:20049` |
   | Chain ID | `20033` |
   | Currency symbol | `AGLS` |
   | Block explorer URL | `https://explorer.aglais.quip.network` |

3. **Save**, then **Switch to Aglais Testnet (Quip Network)**.

Notes:
* Use the **HTTPS** RPC, never `wss://` — Quip's testnet page explicitly says to add the chain "over
  an HTTP transport rather than WebSocket", and MetaMask requires HTTP anyway.
* AGLS is the **native** gas token, so there is nothing to "Import tokens" — the balance appears in
  the main MetaMask balance once the account is funded.
* **Fund before use** — the faucet is terminal-only (it deliberately refuses browser requests):
  ```bash
  curl -X POST https://faucet.aglais.quip.network/request \
    -H 'content-type: application/json' -d '{"dest":"0xYourMetaMaskAddress"}'
  ```
  It returns 10 AGLS and is rate-limited per destination.
* To poke at the deployed Counter from MetaMask, use Remix with **Injected Provider** (the ABI is at
  `out/Counter.sol/Counter.json`) or the scripts here. If you import a key into MetaMask to do this,
  use a **throwaway testnet key in a separate MetaMask profile** — never one that holds real assets.
* MetaMask will happily show the chain as connected even when calls fail for the gas/deposit reasons
  in §4.1; the wallet UI gives no hint about the storage deposit.

---

## 6. What would have made this much easier (vendor feedback)

1. **A "deploy your first contract" page in the docs.** There is no EVM/Solidity/contract-deployment
   page at all. I checked `developers.quip.network/docs/llms.txt`, which enumerates every docs page —
   the whole list is: compute jobs, QVRF, ising topologies, motivation, key properties, participants,
   token, run-a-node, miners, toolchain. Nothing about writing or deploying a contract. The
   quickstart even says the team is still "building out the smart contract layer". The RPC URL,
   chain id and faucet live on a separate marketing page (`aglais.quip.network`), and the RPC URL
   itself I could only get from **ChainList's raw JSON**, not from Quip. If the RPC URL had been in
   the docs I would have saved a fetch round-trip and a trust question.
2. **One paragraph documenting the storage-deposit-as-gas behaviour.** This is the single thing that
   cost the most time. A note saying "contract creation requires a gas limit sized for the storage
   deposit (~X per byte); send value 0; if the tx is mined with status 0, trace it with
   `debug_traceTransaction`" would have turned a 40-minute debugging session into a 2-minute copy.
3. **An actionable failure surface.** `eth_sendRawTransaction` accepts the transaction, it gets mined,
   and the receipt says `status: 0` with an empty `revertReason`. Standard EVM tooling has no way to
   see `StorageDepositNotEnoughFunds`. Even a `revertReason` string on the receipt would help; better
   still, have `eth_estimateGas` refuse to return a gas number that will fail (or have
   `eth_sendRawTransaction` reject the tx up front when the supplied gas limit cannot cover the
   deposit).
4. **A `value` rule in the docs.** "Do not send value with a contract creation" is not discoverable;
   I found it by bisecting value/gas combinations. Sending value produced a *different* error
   (`OutOfGas`, then `execution reverted`), which actively pointed away from the real cause.
5. **Warn that `cast run`/`eth_call` simulation diverges from chain behaviour.** Local EVM simulation
   reported full success for a transaction the chain rejected. If the eth-rpc's `debug_traceCall`
   had been suggested anywhere, I'd have found the true error immediately.
6. **`txpool_*` RPC methods.** Without them, a transaction that enters the pool but never gets mined
   is invisible — I could not tell whether my tx had been dropped, was pending, or had been rejected
   as invalid. `txpool_status`/`txpool_content` (Frontier provides them) would have made the stuck
   PolkaVM tx obvious in seconds.
7. **Point developers at the right compiler.** The docs say the backend is `pallet-revive` but never
   say whether that means "ordinary solc EVM bytecode works" or "you must use `resolc`/PolkaVM". I
   guessed wrong and lost ~15 minutes plus a nonce-replacement detour. One sentence — "standard solc
   EVM bytecode is supported; `resolc` is not required" — is the fix.
8. **Dead link on the homepage.** `quip.network` links to `quip.gitbook.io/docs` for "Read the Docs",
   which 404s ("Content owner not found"). The real docs are at `developers.quip.network/docs`
   (`docs.quip.network` also works). Worth fixing — it's the first link a developer clicks.
9. **Say that the EVM side is brand new.** Knowing up-front that the chain had 58 total transactions
   and 0 verified contracts would have set my expectations correctly: I'd have gone straight to
   debug tracing instead of assuming standard tooling would just work.

---

## 7. Honest summary of time and confidence

* **Working**: deploy, increment, read-back, explorer confirmation, MetaMask instructions — all
  verified with real on-chain evidence above.
* **Confidence in the gas/value recipe**: high. It is reproducible (attempt A at 800M gas / value 0
  succeeded; the six failures around it are all consistent with the deposit explanation), and the
  node's own `eth_estimateGas` independently reports ~732M.
* **Not verified**: whether the ~733M figure scales linearly with bytecode size, and whether the
  `evm_version = "paris"` / `solc 0.8.24` pin in `foundry.toml` was actually necessary. Both are
  guesses I did not A/B test.
* **Left on the machine**: `out-resolc/` (dead-end PolkaVM build), 6 failed transactions and one
  never-mined PolkaVM tx in the pool from the deployer's nonces.
* **Cost, measured**: faucet gave 10 AGLS; the account reads 9.243 AGLS at the end, so the whole
  exercise cost ~0.756 AGLS of test tokens. Almost all of that is the deployment's storage deposit
  (732,883,407 gas ≈ **0.733 AGLS**) plus ~14M gas of failed attempts — a *single successful deploy
  plus three increments* is ~0.745 AGLS. Note how large that is relative to the faucet's 10 AGLS
  drip: with the naive gas settings this cost would be invisible, but the deposit dominates.
  The 1 AGLS sent with the reverted creates came back (reverts refund value).
* Nothing was posted publicly, no mainnet was touched, no Docker containers/volumes were touched, and
  no pre-existing wallet or key on this machine was used.
