#!/usr/bin/env python3
"""Build raw calldata for QuipWOTSVerifier.submitAttestation(bytes,bytes32[67])
from test/testvectors/live.json, and verifySignature static-call calldata too."""
import json

live = json.load(open("test/testvectors/live.json"))
sig = live["signature"]  # 67 hex strings
msg_hex = live["messageHex"].removeprefix("0x")

def selector(sig_str):
    from hashlib import keccak
    try:
        k = keccak
    except NameError:
        import hashlib
        k = lambda b: hashlib.sha3_256(b).digest()  # fallback, wrong (sha3 != keccak)
    return k(sig_str.encode()).hex()[:8]

# keccak256 via cast (python3 stdlib has no keccak; sha3_256 != keccak256)
import subprocess
def keccak_hex(data_hex):
    out = subprocess.run(["cast", "keccak", data_hex], capture_output=True, text=True)
    return out.stdout.strip().removeprefix("0x")

sel_submit = keccak_hex("submitAttestation(bytes,bytes32[67])".encode().hex())[:8]
sel_verify = keccak_hex("verifySignature(bytes32,bytes32,bytes,bytes32[67])".encode().hex())[:8]

# ABI-encode: bytes message, bytes32[67] signature (dynamic offset for bytes = 0x20)
msg_bytes = bytes.fromhex(msg_hex)
head = (32).to_bytes(32, "big")                      # offset to bytes
enc_msg_len = len(msg_bytes).to_bytes(32, "big")
enc_msg = msg_bytes + b"\x00" * ((32 - len(msg_bytes) % 32) % 32)
sig_words = b"".join(bytes.fromhex(s.removeprefix("0x")).rjust(32, b"\x00") for s in sig)
calldata = sel_submit + (head + enc_msg_len + enc_msg + sig_words).hex()

sel_v = sel_verify
head_v = b"".join([
    bytes.fromhex(live["publicSeed"].removeprefix("0x")).rjust(32, b"\x00"),
    bytes.fromhex(live["publicKeyHash"].removeprefix("0x")).rjust(32, b"\x00"),
])
# verifySignature(bytes32,bytes32,bytes,bytes32[67]) — bytes offset after 3 fixed args? No:
# args: bytes32, bytes32, bytes (dynamic), bytes32[67] (static array). offsets: dynamic bytes at 0x60
head_v += (96).to_bytes(32, "big")
enc_v = head_v + enc_msg_len + enc_msg + sig_words
calldata_v = sel_v + enc_v.hex()

open("keys/submit-calldata.txt", "w").write(calldata_v if False else calldata)
open("keys/verify-calldata.txt", "w").write(calldata_v)
print("submitAttestation calldata bytes:", len(calldata) // 2)
print("verifySignature  calldata bytes:", len(calldata_v) // 2)
print("selector submit:", sel_submit, " verify:", sel_v)
