"""Quip post-quantum signing: current hybrid signer, plus optional legacy WOTS+.

`python sign_demo.py` uses Quip's current hybrid sr25519 + FN-DSA-512
signer and verifier. `--legacy-wots` demonstrates earlier one-time WOTS+;
never sign more than once with a WOTS+ key. No blockchain transaction is sent.
"""

from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parent
KEYS = ROOT / "keys"
MESSAGE = b"Quip post-quantum signing demo: integrity matters"


def private_file(prefix: str, data: bytes) -> Path:
    KEYS.mkdir(mode=0o700, exist_ok=True)
    if KEYS.is_symlink():
        raise RuntimeError("Refusing symlinked keys directory")
    os.chmod(KEYS, 0o700)
    path = KEYS / f"{prefix}-{uuid4().hex}.secret"
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as out:
        out.write(data)
    return path


def current_signer() -> None:
    import quip_signer

    seed_path = private_file("hybrid", os.urandom(32))
    # Load a brand-new secret ONLY from ./keys; never use an existing wallet.
    signer = quip_signer.HybridSigner.from_seed(seed_path.read_bytes())
    signature = signer.sign(MESSAGE)
    valid = quip_signer.verify_envelope(MESSAGE, signature, signer.account_id)
    tampered = quip_signer.verify_envelope(MESSAGE + b" (tampered)", signature, signer.account_id)
    print("Algorithm: Quip hybrid sr25519 + FN-DSA-512 (current transaction signer)")
    print("Public key SHA-256 fingerprint:", hashlib.sha256(signer.public_key).hexdigest()[:24])
    print("Signature length (bytes):", len(signature))
    print("Original message verifies:", valid)
    print("Tampered message verifies:", tampered)
    print("Private key file:", seed_path)
    if not valid or tampered:
        raise SystemExit("Hybrid signature verification test failed")


def legacy_wots() -> None:
    from hashsigs import PublicKey, WOTSPlus

    wots = WOTSPlus.keccak256(prefer_rust=False)
    public, secret = wots.generate_key_pair(os.urandom(32))
    secret_path = private_file("wots", secret)
    public_path = KEYS / f"{secret_path.stem}.public"
    public_path.write_bytes(public.to_bytes())
    # WOTS+ accepts exactly 32 bytes. Hash the application message separately.
    signature = wots.sign(secret_path.read_bytes(), hashlib.sha256(MESSAGE).digest())
    stored_public = PublicKey.from_bytes(public_path.read_bytes())
    if stored_public is None:
        raise RuntimeError("Stored public key is invalid")
    valid = wots.verify(stored_public, hashlib.sha256(MESSAGE).digest(), signature)
    tampered = wots.verify(
        stored_public, hashlib.sha256(MESSAGE + b" (tampered)").digest(), signature
    )
    print("Algorithm: Quip legacy WOTS+ / Keccak-256 (ONE TIME ONLY)")
    print("Public key SHA-256 fingerprint:", hashlib.sha256(public.to_bytes()).hexdigest()[:24])
    print("Signature length (bytes):", len(signature))
    print("Original message verifies:", valid)
    print("Tampered message verifies:", tampered)
    print("Private/public key files:", secret_path, public_path)
    if not valid or tampered:
        raise SystemExit("Legacy WOTS+ signature verification test failed")
    print("Never reuse this one-time private key.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--legacy-wots", action="store_true", help="use earlier-generation WOTS+ instead")
    args = parser.parse_args()
    if args.legacy_wots:
        legacy_wots()
    else:
        current_signer()


if __name__ == "__main__":
    main()
