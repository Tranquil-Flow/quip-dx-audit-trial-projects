// Tiny keccak-256 helper (sponge-free reference) using Node's crypto where
// available; falls back to a pure implementation. Used only to hash the demo
// message label to a 32-byte digest.
import { createHash } from "node:crypto";

export function keccak256(label) {
  // Node >= 19 supports keccak256 via createHash.
  return createHash("keccak256").update(label, "utf8").digest("hex");
}
