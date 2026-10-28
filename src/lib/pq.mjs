// Post-quantum signing helpers backed by Quip's real signing library.
// @quip.network/hashsigs-wasm@rc  ->  SHRINCS, profile shrincs-256s-keccak
import { loadHashSigs } from "@quip.network/hashsigs-wasm";
import { bytesToHex, hexToBytes } from "./keys.mjs";

let wasmMod = null;
export async function pq() {
  if (!wasmMod) wasmMod = await loadHashSigs();
  return wasmMod;
}

export const PQ_SCHEME = "SHRINCS-256s-keccak";

/** A signing identity = a SHRINCS key bundle derived from a throwaway seed. */
export async function makePqSigner(masterSeedHex, { maxSignatures = 16 } = {}) {
  const { shrincs } = await pq();
  const seed = hexToBytes(masterSeedHex);
  const keys = shrincs.keygen(seed, maxSignatures); // one-bundle identity
  return {
    scheme: PQ_SCHEME,
    keys,
    commitment: bytesToHex(keys.publicKeyCommitment),
    /** PQ-sign a 32-byte digest (commitment-bound). Consumes a stateful leaf. */
    sign(digestHex) {
      const sig = shrincs.sign(hexToBytes(digestHex), keys);
      return bytesToHex(sig);
    },
    /** Verify a signature against this identity's public commitment. */
    verify(digestHex, sigHex) {
      return shrincs.verify(hexToBytes(sigHex), hexToBytes(digestHex), keys.publicKeyCommitment);
    },
    remaining: () => keys.stateful.remaining,
  };
}

/** Verify a PQ signature against an explicit commitment (no secret needed). */
export async function verifyWithCommitment(digestHex, sigHex, commitmentHex) {
  const { shrincs } = await pq();
  return shrincs.verify(hexToBytes(sigHex), hexToBytes(digestHex), hexToBytes(commitmentHex));
}
