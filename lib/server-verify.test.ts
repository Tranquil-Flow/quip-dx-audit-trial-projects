import { describe, expect, it } from "vitest";
import { keccak_256 } from "@noble/hashes/sha3";
import { WOTSPlus } from "@quip.network/hashsigs";
import {
  ALGORITHM,
  SignatureEnvelope,
  flattenSignature,
} from "./protocol";
import { verifyEnvelope } from "./server-verify";

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function signedEnvelope(message: string): SignatureEnvelope {
  const wots = new WOTSPlus(keccak_256);
  const privateSeed = new Uint8Array(32).fill(11);
  const publicSeed = new Uint8Array(32).fill(22);
  const { privateKey, publicKey } = wots.generateKeyPair(privateSeed, publicSeed);
  const digest = keccak_256(new TextEncoder().encode(message));
  const signature = flattenSignature(wots.sign(privateKey, publicSeed, digest));

  return {
    algorithm: ALGORITHM,
    message,
    publicKey: toBase64(publicKey),
    signature: toBase64(signature),
  };
}

describe("backend verification boundary", () => {
  it("accepts a browser-shaped WOTS+ envelope", () => {
    const result = verifyEnvelope(signedEnvelope("hello"));
    expect(result.valid).toBe(true);
    expect(result.publicKeyBytes).toBe(64);
    expect(result.signatureBytes).toBe(2144);
  });

  it("rejects a changed message", () => {
    const envelope = signedEnvelope("original");
    expect(verifyEnvelope({ ...envelope, message: "changed" }).valid).toBe(false);
  });

  it("rejects malformed transport lengths", () => {
    const envelope = signedEnvelope("hello");
    expect(() => verifyEnvelope({ ...envelope, publicKey: toBase64(new Uint8Array(3)) }))
      .toThrow("publicKey must decode to 64 bytes");
  });

  it("rejects private material and other unexpected fields", () => {
    const envelope = signedEnvelope("hello");
    expect(() => verifyEnvelope({ ...envelope, privateKey: "must-not-cross-boundary" }))
      .toThrow("Unexpected field(s): privateKey");
  });
});
