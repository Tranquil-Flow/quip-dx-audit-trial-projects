"""Pure-Python xxh64 (xxHash-64, seed 0) and Keccak-256.

Quip-chain plumbing needs:
  - twox128(module/name) for Substrate storage keys  -> xxh64 twice
  - Keccak-256 for deriving Ethereum-style addresses (pallet-revive / AccountId32Mapper)
  - blake2b for account-id hashing and SS58 checksums (hashlib, native)

Both implementations verified against standard test vectors.
"""

XXH64_PRIME1 = 11400714785074694791
XXH64_PRIME2 = 14029467366897019727
XXH64_PRIME3 = 1609587929392839161
XXH64_PRIME4 = 9650029242287828579
XXH64_PRIME5 = 2870177450012600261


def xxh64(data: bytes, seed: int = 0) -> int:
    """xxHash-64 (seed 0). Verified against official vectors."""
    n = len(data)
    i = 0
    if n >= 32:
        v1 = (seed + XXH64_PRIME1 + XXH64_PRIME2) & 0xFFFFFFFFFFFFFFFF
        v2 = (seed + XXH64_PRIME2) & 0xFFFFFFFFFFFFFFFF
        v3 = seed & 0xFFFFFFFFFFFFFFFF
        v4 = (seed - XXH64_PRIME1) & 0xFFFFFFFFFFFFFFFF
        while i + 32 <= n:
            for off, v in ((0, v1), (8, v2), (16, v3), (24, v4)):
                lane = int.from_bytes(data[i + off : i + off + 8], "little")
                v = (v + lane * XXH64_PRIME2) & 0xFFFFFFFFFFFFFFFF
                v = ((v << 31) | (v >> 33)) & 0xFFFFFFFFFFFFFFFF
                v = (v * XXH64_PRIME1) & 0xFFFFFFFFFFFFFFFF
                if off == 0:
                    v1 = v
                elif off == 8:
                    v2 = v
                elif off == 16:
                    v3 = v
                else:
                    v4 = v
            i += 32
        h = ((v1 << 1) | (v1 >> 63)) & 0xFFFFFFFFFFFFFFFF
        h = (h + ((v2 << 7) | (v2 >> 57))) & 0xFFFFFFFFFFFFFFFF
        h = (h + ((v3 << 12) | (v3 >> 52))) & 0xFFFFFFFFFFFFFFFF
        h = (h + ((v4 << 18) | (v4 >> 46))) & 0xFFFFFFFFFFFFFFFF
        for v in (v1, v2, v3, v4):
            v = (v * XXH64_PRIME2) & 0xFFFFFFFFFFFFFFFF
            v = ((v << 31) | (v >> 33)) & 0xFFFFFFFFFFFFFFFF
            v = (v * XXH64_PRIME1) & 0xFFFFFFFFFFFFFFFF
            h = (h ^ v) & 0xFFFFFFFFFFFFFFFF
            h = (h * XXH64_PRIME1 + XXH64_PRIME4) & 0xFFFFFFFFFFFFFFFF
    else:
        h = (seed + XXH64_PRIME5) & 0xFFFFFFFFFFFFFFFF

    h = (h + n) & 0xFFFFFFFFFFFFFFFF
    while i + 8 <= n:
        k = int.from_bytes(data[i : i + 8], "little")
        k = (k * XXH64_PRIME2) & 0xFFFFFFFFFFFFFFFF
        k = ((k << 31) | (k >> 33)) & 0xFFFFFFFFFFFFFFFF
        k = (k * XXH64_PRIME1) & 0xFFFFFFFFFFFFFFFF
        h = (h ^ k) & 0xFFFFFFFFFFFFFFFF
        h = (((h << 27) | (h >> 37)) * XXH64_PRIME1 + XXH64_PRIME4) & 0xFFFFFFFFFFFFFFFF
        i += 8
    if i + 4 <= n:
        k = int.from_bytes(data[i : i + 4], "little")
        h = (h ^ (k * XXH64_PRIME1)) & 0xFFFFFFFFFFFFFFFF
        h = (((h << 23) | (h >> 41)) * XXH64_PRIME2 + XXH64_PRIME3) & 0xFFFFFFFFFFFFFFFF
        i += 4
    while i < n:
        h = (h ^ (data[i] * XXH64_PRIME5)) & 0xFFFFFFFFFFFFFFFF
        h = (((h << 11) | (h >> 53)) * XXH64_PRIME1) & 0xFFFFFFFFFFFFFFFF
        i += 1
    h = (h ^ (h >> 33)) & 0xFFFFFFFFFFFFFFFF
    h = (h * XXH64_PRIME2) & 0xFFFFFFFFFFFFFFFF
    h = (h ^ (h >> 29)) & 0xFFFFFFFFFFFFFFFF
    h = (h * XXH64_PRIME3) & 0xFFFFFFFFFFFFFFFF
    h = (h ^ (h >> 32)) & 0xFFFFFFFFFFFFFFFF
    return h


def twox128(data: bytes) -> bytes:
    """Substrate twox128: xxh64(data, seed=0) || xxh64(data, seed=1)."""
    return xxh64(data, 0).to_bytes(8, "little") + xxh64(data, 1).to_bytes(8, "little")


# --- Keccak-256 (legacy Keccak with 0x01 padding, not NIST SHA3) ------------

KECCAK_ROUND_CONSTANTS = [
    0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000,
    0x000000000000808B, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
    0x000000000000008A, 0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
    0x000000008000808B, 0x800000000000008B, 0x8000000000008089, 0x8000000000008003,
    0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
    0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008,
]
KECCAK_RHO = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43,
              25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14]
MASK64 = 0xFFFFFFFFFFFFFFFF


def _rotl(x: int, n: int) -> int:
    return ((x << n) | (x >> (64 - n))) & MASK64


def _keccak_f(state):
    for rc in KECCAK_ROUND_CONSTANTS:
        # theta
        c = [state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20]
             for x in range(5)]
        d = [c[(x - 1) % 5] ^ _rotl(c[(x + 1) % 5], 1) for x in range(5)]
        for x in range(5):
            for y in range(5):
                state[x + 5 * y] ^= d[x]
        # rho + pi
        b = [0] * 25
        for x in range(5):
            for y in range(5):
                b[y + 5 * ((2 * x + 3 * y) % 5)] = _rotl(state[x + 5 * y], KECCAK_RHO[x + 5 * y])
        # chi
        for x in range(5):
            for y in range(5):
                state[x + 5 * y] = b[x + 5 * y] ^ ((~b[(x + 1) % 5 + 5 * y]) & b[(x + 2) % 5 + 5 * y])
        # iota
        state[0] ^= rc
    return state


def keccak256(data: bytes) -> bytes:
    rate = 136  # 1088 bits for 256-bit output
    state = [0] * 25
    # absorb with 0x01 domain padding
    padded = bytearray(data)
    padded.append(0x01)
    while len(padded) % rate != 0:
        padded.append(0x00)
    padded[-1] |= 0x80
    for block in range(0, len(padded), rate):
        chunk = padded[block : block + rate]
        for i in range(rate // 8):
            state[i] ^= int.from_bytes(chunk[i * 8 : i * 8 + 8], "little")
        state = _keccak_f(state)
    out = b"".join(state[i].to_bytes(8, "little") for i in range(4))
    return out[:32]


if __name__ == "__main__":
    # Test vectors
    assert xxh64(b"", 0) == 0xEF46DB3751D8E999, "xxh64 empty"
    assert xxh64(b"a", 0) == 0xD24EC4F1A98C6E5B, "xxh64 'a'"
    assert xxh64(b"abc", 0) == 0x44BC2CF5AD770999, "xxh64 'abc'"
    assert xxh64(b"hello", 0) == 0x26C7827D889F6DA3, "xxh64 'hello'"
    # keccak256("") — canonical Ethereum constant (ethers.js keccak256("0x"))
    assert keccak256(b"").hex() == "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
    assert keccak256(b"abc").hex() == "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45"
    print("xxh64 + keccak256 vectors OK")
