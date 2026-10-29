"""Create a brand-new throwaway testnet account for Quip Network (aglais).

Keystore lives inside the project directory (./keys/keystore.json), never in
the SDK's default ~/.quip path. Only the public account address is printed;
key material is never displayed.
"""

import json
import sys
from pathlib import Path

from xqsa import quip_networks, quip_signing
from xqsa.quip_faucet import fund_from_faucet

KEYSTORE = Path("keys/keystore.json")

def main() -> int:
    KEYSTORE.parent.mkdir(parents=True, exist_ok=True)
    if KEYSTORE.exists():
        print(f"ABORT: {KEYSTORE} already exists — refusing to reuse a keystore.")
        return 1

    ks = quip_signing.generate_keystore(KEYSTORE)
    # Public address only (the account_id_hex cached in the keystore JSON).
    raw = json.loads(KEYSTORE.read_text())
    address = raw["account_id_hex"]
    print(f"keystore written: {KEYSTORE} (mode {oct(KEYSTORE.stat().st_mode & 0o777)})")
    print(f"public account address: {address}")

    preset = dict(quip_networks.NETWORKS)["aglais"]
    print(f"network preset: rpc={preset.rpc} faucet={preset.faucet}")
    body = fund_from_faucet(address, url=preset.faucet)
    print(f"faucet response: {json.dumps(body)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
