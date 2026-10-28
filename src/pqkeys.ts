// Persistent SHRINCS signer. sign() is STATEFUL (one-time leaf per call): the secret is re-serialised to disk
// BEFORE the signature is returned/broadcast, as the Quip Accounts docs require.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { loadHashSigs, shrincsKeysToSecretBytes } from "@quip.network/hashsigs-wasm";
import { bytesToHex, hexToBytes, type Hex } from "viem";

const hs = await loadHashSigs();
export const MAX_SIGNATURES = 64;

export class PqSigner {
  private keys: ReturnType<typeof hs.shrincs.keygen>;
  readonly commitment: Hex;
  constructor(readonly name: string) {
    mkdirSync("keys", { recursive: true });
    this.file = `keys/${name}.shrincs.json`;
    if (existsSync(this.file)) {
      const j = JSON.parse(readFileSync(this.file, "utf8"));
      this.keys = hs.shrincsImportSigningKey(hexToBytes(j.secretKeyHex));
    } else {
      this.keys = hs.shrincs.keygen(crypto.getRandomValues(new Uint8Array(32)), MAX_SIGNATURES);
      this.persist();
    }
    this.commitment = bytesToHex(this.keys.publicKeyCommitment);
  }
  private file: string;
  private persist() {
    writeFileSync(this.file, JSON.stringify({
      name: this.name, profile: hs.profileName, maxSignatures: MAX_SIGNATURES,
      publicKeyCommitment: bytesToHex(this.keys.publicKeyCommitment),
      leavesRemaining: this.keys.stateful.remaining,
      secretKeyHex: bytesToHex(shrincsKeysToSecretBytes(this.keys)),
    }, null, 2), { mode: 0o600 });
  }
  get remaining() { return this.keys.stateful.remaining; }
  /** Sign a 32-byte hash. Persists the advanced key state first. */
  sign(hash32: Hex): Hex {
    const sig = hs.shrincs.sign(hexToBytes(hash32), this.keys);
    this.persist();
    return bytesToHex(sig);
  }
}

/** Off-chain verification with the same wasm library (no RPC). */
export function verifyPq(sig: Hex, hash32: Hex, commitment: Hex): boolean {
  return hs.shrincs.verify(hexToBytes(sig), hexToBytes(hash32), hexToBytes(commitment));
}
export const pqProfile = hs.profileName;
