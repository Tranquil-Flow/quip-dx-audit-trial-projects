#!/usr/bin/env python3
"""sign_demo.py — Quip Network post-quantum signing demo.

Uses Quip's own signing extension, `quip-signer` (installed by the official
`xquad[quip]` extra), which implements Quip's H4 hybrid signature scheme:
classical sr25519 + FN-DSA-512 (Falcon-512, a NIST post-quantum signature).

Demo:
  1. Generate a brand-new throwaway Quip post-quantum keypair (32-byte seed
     -> H4 public key + compact account id). The seed is stored in
     ./keys/sign_demo_seed.bin and is NEVER printed.
  2. Sign a message.
  3. Verify the signature -> True.
  4. Verify a tampered message -> False (and tampered signature -> rejected).

Usage:
  python3 sign_demo.py
"""

from __future__ import annotations

import os
import sys

import quip_signer

KEYS_DIR = "keys"
SEED_PATH = os.path.join(KEYS_DIR, "sign_demo_seed.bin")
MESSAGE = b"Quip Network post-quantum signing demo: jobs [3,5,2,7,4,6] -> 3 machines"


def load_or_create_seed() -> bytes:
    """Fresh throwaway 32-byte seed, kept in ./keys, never printed."""
    os.makedirs(KEYS_DIR, exist_ok=True)
    if os.path.exists(SEED_PATH):
        with open(SEED_PATH, "rb") as fh:
            seed = fh.read()
        if len(seed) != 32:
            raise RuntimeError(f"{SEED_PATH} is corrupt (expected 32 bytes); "
                               "delete it and re-run to mint a fresh throwaway key")
        print(f"[keys] loaded existing throwaway seed from {SEED_PATH} "
              f"({len(seed)} bytes; contents not shown)")
        return seed
    import secrets
    seed = secrets.token_bytes(32)          # brand-new throwaway key
    with open(SEED_PATH, "wb") as fh:
        fh.write(seed)
    try:
        os.chmod(SEED_PATH, 0o600)
    except OSError:
        pass
    print(f"[keys] generated fresh throwaway seed -> {SEED_PATH} "
          "(32 bytes; contents not shown)")
    return seed


def checked_verify(payload: bytes, envelope: bytes, account_id: bytes) -> bool:
    """verify_envelope returns bool, but be defensive about exceptions."""
    try:
        return bool(quip_signer.verify_envelope(payload, envelope, account_id))
    except quip_signer.QuipSignerError as exc:
        print(f"        (verifier raised QuipSignerError: {exc})")
        return False


def main() -> int:
    print("=" * 72)
    print("Quip Network sign_demo — H4 hybrid signatures "
          "(sr25519 + FN-DSA-512, post-quantum)")
    print(f"signer module : quip_signer {getattr(quip_signer, '__version__', '')}".rstrip())
    print("=" * 72)

    # ---- 1) keypair --------------------------------------------------------
    seed = load_or_create_seed()
    signer = quip_signer.HybridSigner.from_seed(seed)
    public_key = signer.public_key     # 929 bytes, H4 public commitment
    account_id = signer.account_id     # 32 bytes, compact Quip account id
    print(f"\n[1] keypair generated (Quip H4: sr25519 + FN-DSA-512)")
    print(f"    public key ({len(public_key)} bytes): {public_key.hex()}")
    print(f"    account id ({len(account_id)} bytes): {account_id.hex()}")

    # ---- 2) sign -----------------------------------------------------------
    envelope = signer.sign(MESSAGE)
    print(f"\n[2] signed message ({len(MESSAGE)} bytes)")
    print(f"    message : {MESSAGE.decode()}")
    print(f"    signature envelope ({len(envelope)} bytes): {envelope.hex()}")

    # ---- 3) verify (must pass) --------------------------------------------
    ok = checked_verify(MESSAGE, envelope, account_id)
    print(f"\n[3] verify(original message)  -> {ok}")
    if not ok:
        print("    UNEXPECTED: valid signature failed to verify")
        return 1

    # ---- 4) tampered message (must fail) ----------------------------------
    tampered = bytearray(MESSAGE)
    tampered[len(tampered) // 2] ^= 0x01      # flip one bit mid-message
    tampered = bytes(tampered)
    bad_msg = checked_verify(tampered, envelope, account_id)
    print(f"\n[4] tamper test — flip 1 bit in the message")
    print(f"    tampered: {tampered.decode()}")
    print(f"    verify(tampered message)  -> {bad_msg}")
    if bad_msg:
        print("    UNEXPECTED: tampered message verified")
        return 1

    # ---- 5) tampered signature (must fail) --------------------------------
    bad_env = bytearray(envelope)
    bad_env[len(bad_env) // 2] ^= 0x01         # flip one bit in the signature
    bad_env = bytes(bad_env)
    bad_sig = checked_verify(MESSAGE, bad_env, account_id)
    print(f"\n[5] tamper test — flip 1 bit in the signature envelope")
    print(f"    verify(tampered signature) -> {bad_sig}")
    if bad_sig:
        print("    UNEXPECTED: tampered signature verified")
        return 1

    # ---- 6) wrong account (must fail) -------------------------------------
    other = quip_signer.HybridSigner.from_seed(b"\x11" * 32)  # different key
    wrong_acct = checked_verify(MESSAGE, envelope, other.account_id)
    print(f"\n[6] wrong-signer test — verify against a different account id")
    print(f"    verify(other account)      -> {wrong_acct}")
    if wrong_acct:
        print("    UNEXPECTED: signature verified under wrong account")
        return 1

    print("\n" + "=" * 72)
    print("RESULT: keypair OK, signature verifies, all tamper tests fail "
          "as they must.")
    print("Seed kept at " + SEED_PATH + " (throwaway, never printed).")
    print("=" * 72)
    return 0


if __name__ == "__main__":
    sys.exit(main())
