# t06-a

- **Round:** Round 1
- **Model:** DeepSeek V4 Flash
- **Task:** Deploy a Counter to the Aglais EVM and add it to MetaMask
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Deploy a Counter to the Aglais EVM and add it to MetaMask | DeepSeek V4 Flash | Aglais EVM RPC (plain EVM) | Built and working on testnet | ~13 min | No EVM deploy guide; the storage deposit made a ~606-byte deploy use ~733M gas [C-TRL-27, C-TRL-30]. Rebuilds differ (works / partial). |

## Trial card

- **Model:** DeepSeek V4 Flash.
- **What it does:** Deploys a plain Solidity `Counter` (increment/read) to the Aglais EVM via Foundry and documents adding Aglais to MetaMask.
- **Quip products and integration:** Aglais EVM JSON-RPC — CHAIN_ONLY (no Quip SDK, PQ signing or Quip contract used).
- **Evidence:** Aglais EVM tx [0x4b692fb8a5a2ff947f6f624ef625a3e9e76add8d3d837602af229befca9813ec](https://explorer.aglais.quip.network/tx/0x4b692fb8a5a2ff947f6f624ef625a3e9e76add8d3d837602af229befca9813ec) (deploy), contract [0x51ddad71d1a185ec51e2451e7da3267ccf976bf4](https://explorer.aglais.quip.network/address/0x51ddad71d1a185ec51e2451e7da3267ccf976bf4), first increment tx [0x5dc882ca1beb64ff58cac406780df48e380093b683b723e296d981712160df59](https://explorer.aglais.quip.network/tx/0x5dc882ca1beb64ff58cac406780df48e380093b683b723e296d981712160df59). Both independent rebuilds independently deployed and incremented fresh copies too, e.g. one rebuild's contract [0x2e72B031c0f7e23A1EbBBa98D0cA7B64CfcD56e4](https://explorer.aglais.quip.network/address/0x2e72B031c0f7e23A1EbBBa98D0cA7B64CfcD56e4); the other rebuild's deploy script timed out waiting for a receipt, but the transaction mined and its increments succeeded.
- **Key Quip call** (`scripts/deploy.sh:26-41`):
```bash
echo "==> Compiling"
forge build --root "$PROJECT_DIR"
BYTECODE="$(forge inspect --root "$PROJECT_DIR" src/Counter.sol:Counter bytecode)"
echo "    runtime creation bytecode: $((${#BYTECODE} / 2)) bytes"

# NOTE: value is deliberately 0 and the gas limit is deliberately huge.
# See the comment in scripts/env.sh for why.
echo "==> Sending deployment tx (gas limit $DEPLOY_GAS_LIMIT, value 0)"
TXHASH="$(cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_PK" \
  --legacy \
  --gas-price "$GAS_PRICE" \
  --gas-limit "$DEPLOY_GAS_LIMIT" \
  --async \
  --create "$BYTECODE" | tail -1)"
```
- **What got in the way:** No EVM deploy guide in the developer docs [[C-TRL-27](https://developers.quip.network/docs/llms.txt)], and the pallet-revive storage deposit and gas scale are not on developers.quip.network, llms.txt or agls.quip.network (the quip-validator repo's pallet-revive notes do list them): the builder's deploy of a ~606-byte Counter used about 733M gas, and the rebuilds' later deploys about 326M [[C-TRL-27](https://developers.quip.network/docs/llms.txt), [C-TRL-30](https://explorer.aglais.quip.network/tx/0x9347459212a9432002a11ea44bd7561ba156a51e7512f82b1304f8d6465464f4)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
