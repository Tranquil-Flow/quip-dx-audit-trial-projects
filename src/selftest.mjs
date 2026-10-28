import { QuipSigner } from "@quip.network/solana-sdk";
import { keccak_256 } from "@noble/hashes/sha3";
const s = new QuipSigner(new Uint8Array(32).fill(7)), vault = new Uint8Array(32).fill(1);
const kp = s.generateKeyPair(vault);
const sig = s.sign(keccak_256(new TextEncoder().encode("test")), vault, kp.publicKey.publicSeed);
console.log("WOTS+ sig chunks:", sig.length, "x32 =", sig.length * 32, "bytes; pubkeyHash", Buffer.from(kp.publicKey.publicKeyHash).toString("hex"));
