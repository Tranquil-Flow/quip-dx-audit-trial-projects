#!/usr/bin/env python3
"""
Quip testnet post-quantum treasury PoC.

Flow:
  1. Create a Quip post-quantum (H4 = sr25519 + FN-DSA-512) account
     from a fresh 32-byte seed (./keys/).
  2. Fund it with testnet tokens (AGLS) via the canonical Aglais faucet.
  3. Withdraw part of the balance to a normal (non-PQ) address:
     a fresh secp256k1 / Ethereum-style address, which pallet-revive's
     AccountId32Mapper represents on-chain as <h160> || 0xEE*12.
  4. Print transaction hashes + balances for explorer verification.

Subcommands: keygen, fund, withdraw, status, run (all in one)
Requires: pip install quip-signer cryptography base58
"""

import hashlib
import json
import os
import secrets
import sys
import time
import urllib.request

from base58 import b58encode

try:
    from quip_signer import (
        account_id_from_public,
        public_from_seed,
        sign_payload_from_seed,
    )
except ImportError:  # pragma: no cover
    sys.exit("quip-signer not installed: pip install quip-signer")

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crypto_helpers import keccak256, twox128  # noqa: E402

RPC_URL = os.environ.get("QUIP_RPC", "https://bootnode-1.aglais.quip.network:20049/rpc")
FAUCET_URL = os.environ.get("QUIP_FAUCET", "https://faucet.aglais.quip.network")
SS58_FORMAT = 42
UNIT = 1_000_000_000_000  # 1 AGLS in plancks
KEYS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "keys")
KEYS_DIR = os.path.abspath(KEYS_DIR)

FAUCET_AMOUNT = 10 * UNIT          # request 10 AGLS
WITHDRAW_AMOUNT = 3 * UNIT         # withdraw 3 AGLS back out

GENESIS = bytes.fromhex(
    "59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286")


# ---------- RPC ----------

def rpc(method, params):
    req = urllib.request.Request(
        RPC_URL,
        data=json.dumps({"jsonrpc": "2.0", "id": 1,
                         "method": method, "params": params}).encode(),
        headers={"Content-Type": "application/json"})
    try:
        resp = json.load(urllib.request.urlopen(req, timeout=30))
    except Exception as e:
        sys.exit(f"RPC {method} failed: {e}")
    if "error" in resp and resp["error"]:
        sys.exit(f"RPC {method} error: {resp['error']}")
    return resp["result"]


def http_post_json(url, body):
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"})
    try:
        return urllib.request.urlopen(req, timeout=30)
    except urllib.error.HTTPError as e:
        return e


# ---------- SCALE ----------

def compact(n):
    if n < 64:
        return bytes([n << 2])
    if n < 2 ** 14:
        return ((n << 2) | 1).to_bytes(2, "little")
    if n < 2 ** 30:
        return ((n << 2) | 2).to_bytes(4, "little")
    bl = (n.bit_length() + 7) // 8
    return bytes([((bl - 4) << 2) | 3]) + n.to_bytes(bl, "little")


# ---------- addresses ----------

def ss58(account32: bytes) -> str:
    prefix = bytes([SS58_FORMAT])
    checksum = hashlib.blake2b(b"SS58PRE" + prefix + account32,
                               digest_size=64).digest()[:2]
    return b58encode(prefix + account32 + checksum).decode()


def eth_address_from_pubkey(secp_pub: bytes) -> bytes:
    """20-byte Ethereum address from 33-byte compressed secp256k1 pubkey."""
    pub = ec.EllipticCurvePublicKey.from_encoded_point(
        ec.SECP256K1(), secp_pub)
    nums = pub.public_numbers()
    uncompressed = b"\x04" + nums.x.to_bytes(32, "big") + nums.y.to_bytes(32, "big")
    return keccak256(uncompressed)[12:]


def revive_account(h160: bytes) -> bytes:
    """pallet-revive AccountId32Mapper fallback: h160 || 0xEE*12."""
    return h160 + b"\xee" * 12


# ---------- keys ----------

def load_or_create_seeds():
    os.makedirs(KEYS_DIR, mode=0o700, exist_ok=True)
    pq_path = os.path.join(KEYS_DIR, "pq_seed.bin")
    eth_path = os.path.join(KEYS_DIR, "normal_eth_seed.bin")

    if os.path.exists(pq_path):
        pq_seed = open(pq_path, "rb").read()
        print(f"[keygen] reusing PQ seed {pq_path}")
    else:
        pq_seed = secrets.token_bytes(32)
        with open(pq_path, "wb") as f:
            f.write(pq_seed)
        os.chmod(pq_path, 0o600)
        print(f"[keygen] new throwaway PQ seed -> {pq_path}")

    if os.path.exists(eth_path):
        eth_seed = open(eth_path, "rb").read()
        print(f"[keygen] reusing normal-address secp256k1 seed {eth_path}")
    else:
        eth_seed = secrets.token_bytes(32)
        with open(eth_path, "wb") as f:
            f.write(eth_seed)
        os.chmod(eth_path, 0o600)
        print(f"[keygen] new throwaway secp256k1 seed -> {eth_path}")

    return pq_seed, eth_seed


def derive_accounts(pq_seed, eth_seed):
    pq_pub = public_from_seed(pq_seed)                       # 929 bytes
    pq_acct = bytes(account_id_from_public(pq_pub))          # 32 bytes

    eth_priv = ec.derive_private_key(int.from_bytes(eth_seed, "big"), ec.SECP256K1())
    eth_pub_compressed = eth_priv.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.CompressedPoint)
    h160 = eth_address_from_pubkey(eth_pub_compressed)
    normal_acct = revive_account(h160)                       # h160 || EE*12

    return {
        "pq_pub": pq_pub,
        "pq_acct": pq_acct,
        "pq_ss58": ss58(pq_acct),
        "h160": h160,
        "normal_acct": normal_acct,
        "normal_ss58": ss58(normal_acct),
    }


# ---------- chain state ----------

def account_storage_key(acct: bytes) -> str:
    return "0x" + (twox128(b"System") + twox128(b"Account")
                   + hashlib.blake2b(acct, digest_size=16).digest() + acct).hex()


def get_account_info(acct: bytes):
    raw = rpc("state_getStorage", [account_storage_key(acct)])
    if raw is None:
        return None
    b = bytes.fromhex(raw[2:])
    nonce = int.from_bytes(b[:4], "little")
    consumers = int.from_bytes(b[4:8], "little")
    providers = int.from_bytes(b[8:12], "little")
    sufficients = int.from_bytes(b[12:16], "little")
    free = int.from_bytes(b[16:32], "little")
    reserved = int.from_bytes(b[32:48], "little")
    frozen = int.from_bytes(b[48:64], "little")
    return {"nonce": nonce, "free": free, "reserved": reserved, "frozen": frozen,
            "consumers": consumers, "providers": providers, "sufficients": sufficients}


def get_nonce(acct: bytes) -> int:
    # system_accountNextIndex wants an SS58 address; the storage decode is simpler.
    info = get_account_info(acct)
    return info["nonce"] if info else 0


def fmt_amount(plancks):
    return f"{plancks / UNIT:.6f} AGLS ({plancks} plancks)"


# ---------- tx building ----------

def build_transfer_call(dest_acct32: bytes, amount: int) -> bytes:
    # Balances (pallet 4) .transfer_allow_death (call 0)
    #   dest: MultiAddress::Id (0x00) + 32 bytes
    #   value: Compact<u128>
    return b"\x04\x00\x00" + dest_acct32 + compact(amount)


def build_signed_extrinsic(seed, acct32, call: bytes, nonce: int,
                           spec_version: int, tx_version: int) -> bytes:
    extra = b"\x00" + compact(nonce) + compact(0) + b"\x00"   # era immortal, tip 0
    additional = (spec_version.to_bytes(4, "little")
                  + tx_version.to_bytes(4, "little")
                  + GENESIS + GENESIS + b"\x00")
    payload = call + extra + additional
    if len(payload) > 256:  # Substrate SignedPayload rule
        payload = hashlib.blake2b(payload, digest_size=32).digest()
    envelope = sign_payload_from_seed(seed, payload)  # 1660 bytes
    body = b"\x84\x00" + acct32 + envelope + extra + call
    return compact(len(body)) + body


# ---------- actions ----------

def do_keygen():
    pq_seed, eth_seed = load_or_create_seeds()
    a = derive_accounts(pq_seed, eth_seed)
    print(f"Post-quantum account (H4): {a['pq_ss58']}")
    print(f"  hex: 0x{a['pq_acct'].hex()}")
    print(f"Normal address (secp256k1, non-PQ): 0x{a['h160'].hex()}")
    print(f"  on-chain account: {a['normal_ss58']}")
    print(f"  hex: 0x{a['normal_acct'].hex()}")
    return a


def do_fund(a, amount=FAUCET_AMOUNT):
    info = get_account_info(a["pq_acct"])
    if info and info["free"] >= amount:
        print(f"[fund] PQ account already holds {fmt_amount(info['free'])} — skipping faucet")
        return info
    print(f"[fund] requesting {fmt_amount(amount)} from faucet {FAUCET_URL}")
    resp = http_post_json(FAUCET_URL + "/request",
                          {"dest": "0x" + a["pq_acct"].hex(), "amount": amount})
    body = resp.read().decode(errors="replace")
    if resp.status not in (200, 403):
        sys.exit(f"[fund] faucet failed ({resp.status}): {body}")
    print(f"[fund] faucet replied {resp.status}: {body[:200]}")
    # poll for balance
    for _ in range(30):
        info = get_account_info(a["pq_acct"])
        if info and info["free"] > 0:
            print(f"[fund] balance now {fmt_amount(info['free'])}")
            return info
        time.sleep(4)
    sys.exit("[fund] balance never arrived — faucet may be capped; check account status")


def do_withdraw(a, amount=WITHDRAW_AMOUNT, fee_buffer=UNIT // 2):
    info = get_account_info(a["pq_acct"])
    if not info:
        sys.exit("[withdraw] PQ account has no on-chain presence yet")
    if info["free"] < amount + fee_buffer:
        sys.exit(f"[withdraw] insufficient funds: have {fmt_amount(info['free'])}, "
                 f"need {fmt_amount(amount)} + buffer")

    nonce = get_nonce(a["pq_acct"])
    rv = rpc("state_getRuntimeVersion", [])
    spec, txver = int(rv["specVersion"]), int(rv["transactionVersion"])

    call = build_transfer_call(a["normal_acct"], amount)
    with open(os.path.join(KEYS_DIR, "pq_seed.bin"), "rb") as f:
        pq_seed = f.read()
    ext = build_signed_extrinsic(pq_seed, a["pq_acct"], call, nonce, spec, txver)
    tx_hash = "0x" + hashlib.blake2b(ext, digest_size=32).digest().hex()

    print(f"[withdraw] sending {fmt_amount(amount)} from PQ account")
    print(f"[withdraw]   to normal address 0x{a['h160'].hex()} "
          f"(on-chain {a['normal_ss58']})")
    print(f"[withdraw]   nonce={nonce} spec={spec} txver={txver} tip=0")
    result = rpc("author_submitExtrinsic", ["0x" + ext.hex()])
    print(f"[withdraw] submitted, extrinsic hash (tx id): {tx_hash}")
    assert result.lower() == tx_hash.lower(), f"hash mismatch: {result}"
    return tx_hash


def do_status(a):
    for label, acct in (("PQ account", a["pq_acct"]),
                        ("Normal address", a["normal_acct"])):
        info = get_account_info(acct)
        if info:
            print(f"{label}: nonce={info['nonce']} free={fmt_amount(info['free'])} "
                  f"reserved={fmt_amount(info['reserved'])}")
        else:
            print(f"{label}: no account on chain yet")


def wait_for_inclusion(a, tx_hash, before_nonce):
    print("[wait] polling for inclusion (6s blocks)...")
    for _ in range(25):
        info = get_account_info(a["pq_acct"])
        if info and info["nonce"] > before_nonce:
            print(f"[wait] confirmed: PQ nonce advanced to {info['nonce']}")
            hdr = rpc("chain_getHeader", [])
            tip = int(hdr["number"], 16)
            # locate the exact block containing our extrinsic
            for height in range(tip, tip - 8, -1):
                blk = rpc("chain_getBlock", [rpc("chain_getBlockHash", [height])])
                for i, x in enumerate(blk["block"]["extrinsics"]):
                    xb = bytes.fromhex(x[2:])
                    hx = hashlib.blake2b(xb, digest_size=32).hexdigest()
                    if hx == tx_hash[2:]:
                        print(f"[wait] tx included in block {height}, "
                              f"extrinsic #{i}")
                        print(f"[wait] block hash: "
                              f"{rpc('chain_getBlockHash', [height])}")
                        return True
            return True
        time.sleep(6)
    return False


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "run"
    print("== Quip testnet PQ treasury PoC ==")
    print(f"RPC: {RPC_URL}")

    if cmd in ("keygen", "run"):
        a = do_keygen()
    else:
        pq_seed, eth_seed = load_or_create_seeds()
        a = derive_accounts(pq_seed, eth_seed)

    if cmd in ("fund", "run"):
        do_fund(a)
    if cmd in ("withdraw", "run"):
        info = get_account_info(a["pq_acct"])
        if info and info["free"] >= WITHDRAW_AMOUNT:
            before_nonce = info["nonce"]
            tx_hash = do_withdraw(a)
            if wait_for_inclusion(a, tx_hash, before_nonce):
                print(f"\nTX HASH (check on explorer): {tx_hash}")
            else:
                print(f"\nTX HASH: {tx_hash} (not yet observed in a block — retry status)")
        else:
            print("[withdraw] skipping — run 'fund' first")
    if cmd in ("status", "run"):
        do_status(a)

    print("\nExplorer: polkadot.js Apps -> "
          "https://polkadot.js.org/apps/#/explorer?rpc="
          "wss%3A%2F%2Fbootnode-1.aglais.quip.network%3A20049%2Frpc")
    print("Then paste the TX HASH into Developer > Extrinsics / Chain State.")


if __name__ == "__main__":
    main()
