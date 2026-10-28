# Result

Completed: 2026-09-28T12:50:43Z

## Overall status: PARTIAL

The complete integration works: an 8-variable portfolio QUBO was submitted to the live Aglais compute marketplace, its returned solution and order ID were recorded in an immutable Solidity contract on the same testnet, and the read-back script verified every field and the canonical hash.

The overall label is PARTIAL rather than WORKING only because Quip's result does not attest the winning miner's hardware. Aglais is a heterogeneous CPU/GPU/QPU network. This run proves that Quip's optimization network produced the answer, but it cannot prove that this particular answer physically ran on a quantum processor. Claiming otherwise would overstate the evidence.

## Component status

| Component | Status | Evidence |
|---|---|---|
| 8-asset QUBO builder | WORKING | Two K4 one-hot groups; local exhaustive verification and CPU smoke test pass. |
| Quip Aglais compute submission | WORKING | On-chain order ID 144; four miner submissions; returned chain-energy check is true. |
| QPU hardware attribution | BLOCKED | XQuad metadata provides the winner account but no CPU/GPU/QPU attestation. |
| Solidity contract compilation | WORKING | 5,608-byte PolkaVM artifact plus 1,042-byte EVM artifact. |
| Aglais smart-contract deployment | WORKING | Successful receipt and non-empty code at the address below. |
| On-chain result storage | WORKING | Constructor permanently stores job ID, mask, energy, result hash, and recorder. |
| Read-back/verification script | WORKING | Five checks return true. |
| Automated tests | WORKING | `2 passed`. |

## Live evidence

Network: Aglais (Quip Network testnet)

- Compute order/job ID: `144`
- Compute submitter: `5EAj3gvvNodcA7g3hyXaDhJvgYB4ts1g4Et1V2zJFYQ9G2DK`
- Winning solver account: `5Dn1SzVHV4Be4TGzgiUqSkAXUnYoSP9hTBrxwYBKZAC3rAsW`
- Number of solver submissions: `4`
- `energy_matches_chain`: `true`
- Chosen asset mask: `24` (`0b00011000`)
- Chosen assets: `DRAY`, `ECHO`
- QUBO energy: `-30`
- Human objective: `10`
- Exhaustive optimum: `3` (`BRAV`, `GAMA`), so the network heuristic's optimality gap was `7`
- Canonical result hash: `0xafb150980ee7433f431ed8e19d77c717738db2248446d9c83862508c17fe731b`

Contract evidence:

- Chain ID: `20033`
- Contract: `0x86846DC4136DB93d067b6fF6F78D8882FfF7589a`
- Deployment transaction: `0x7f7621ad1229b120f6cab0e677b2f8693702465d13db140856d887f9346a1ccc`
- Block: `377010` (`0x5c0b2`)
- Receipt status: `0x1`
- Deployer/recorder: `0x90bc4324c0772887F9c04D75a28cccc41Df739d8`
- Faucet funding extrinsic: `0x515e249c346a109a8aec6b44afc173e1062d2c5580f535a6772b3882ade31f72`
- Explorer transaction: https://explorer.aglais.quip.network/tx/0x7f7621ad1229b120f6cab0e677b2f8693702465d13db140856d887f9346a1ccc
- Explorer contract: https://explorer.aglais.quip.network/address/0x86846DC4136DB93d067b6fF6F78D8882FfF7589a

Live JSON-RPC verification found 1,292 hex characters of deployed code and a successful receipt containing the `ResultRecorded` event.

## Read-back output

```json
{
  "contract_address": "0x86846DC4136DB93d067b6fF6F78D8882FfF7589a",
  "job_id": "144",
  "asset_mask": 24,
  "selected_symbols": ["DRAY", "ECHO"],
  "energy": "-30",
  "result_hash": "0xafb150980ee7433f431ed8e19d77c717738db2248446d9c83862508c17fe731b",
  "recorder": "0x90bc4324c0772887F9c04D75a28cccc41Df739d8",
  "checks": {
    "job_id": true,
    "asset_mask": true,
    "energy": true,
    "hash_matches_artifact": true,
    "canonical_hash_valid": true
  }
}
```

## How to run

From the project root:

```sh
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python 'xquad[quip]' pytest
npm install
```

Local smoke test and exhaustive comparison:

```sh
.venv/bin/python scripts/portfolio_job.py --local --output artifacts/local-result.json
.venv/bin/pytest -q
```

Submit a new live Aglais compute job using only the throwaway key in `./keys`:

```sh
.venv/bin/python scripts/portfolio_job.py --network aglais
```

Recover an existing order, including this run:

```sh
.venv/bin/python scripts/portfolio_job.py --network aglais --query-id 144
```

Compile and deploy a new immutable record from `artifacts/compute-result.json`:

```sh
npm run compile
npm run deploy
```

Read the deployed result and verify it against the canonical artifact:

```sh
npm run read
```

The existing `artifacts/deployment.json` points the read script at the live contract above. The keys in `./keys` are newly generated, testnet-only, mode `0600`, and ignored by Git. AGLS has no value. Do not reuse these keys anywhere.

## What did not work, and why

1. **Hardware-level “quantum” proof is unavailable.** The network's winner metadata includes an account, energy, and submission counts but no hardware class or QPU attestation. The QUBO used the registered hardware topology rather than `native` mode, so QPU miners were eligible, but eligibility is not proof that a QPU won.

2. **The network answer was not globally optimal.** It was feasible (one asset from each sector) but had objective 10 versus exhaustive optimum 3. This is a legitimate heuristic network output, and the demo records it unchanged. It does not silently substitute the better local answer.

3. **The high-level compute documentation contradicted current tooling.** The public “Submit Your First Compute Job” page said public RPC details were not published, while XQuad 0.4.1 and the Aglais page contained working RPC/faucet presets.

4. **Raw PolkaVM bytes cannot be sent as ordinary EVM CREATE initcode.** That first attempt never entered the chain. Native PVM deployment requires separate code upload and instantiation through the Revive pallet. The working route used standard EVM bytecode, which Quip's runtime explicitly enables with `AllowEVMBytecode=true`, through Aglais's advertised Ethereum RPC. The build still produces the native PVM artifact for a future native deployment path.

5. **The two Quip surfaces require manual glue.** Compute uses WSS, hybrid sr25519+FN-DSA signing, SS58/AccountId32, and 12-decimal AGLS. Contracts use HTTP Ethereum JSON-RPC, secp256k1/H160, and 18-decimal presentation. No vendor SDK moves an order result directly into a contract transaction.

## What would make this easier

- One current end-to-end tutorial that submits a compute job and writes its result through Aglais's EVM interface.
- A stable, prominent network manifest containing both RPCs, faucet, chain ID, account mapping, and token precision rules.
- Hardware provenance in `SolverResult.metadata` (at minimum CPU/GPU/QPU class, ideally signed provider and execution transcript).
- A compute transaction/extrinsic hash in addition to `order_id`.
- A documented block-explorer URL scheme for compute orders.
- An official JS/TS bridge library that accepts an XQuad result and produces the contract transaction payload.
- Clear separate examples for EVM-bytecode deployment and native PolkaVM upload/instantiate deployment on Aglais.
- Quality-floor controls exposed by `SolverQuip` so a caller can require a known energy threshold for small, exhaustively checkable problems.

See `DEVLOG.md` for the ordered source list, all meaningful commands, dead ends, errors, and workarounds.
