import json
from pathlib import Path

from web3 import Web3

ROOT = Path(__file__).resolve().parent.parent
DEPLOY = json.loads((ROOT / "deployments.json").read_text())
ABI = json.loads((ROOT / "contracts/out/QuipResultRegistry.sol/QuipResultRegistry.json").read_text())["abi"]


def contract():
    w3 = Web3(Web3.HTTPProvider(DEPLOY["evmRpc"], request_kwargs={"timeout": 60}))
    return w3, w3.eth.contract(address=Web3.to_checksum_address(DEPLOY["QuipResultRegistry"]), abi=ABI)
