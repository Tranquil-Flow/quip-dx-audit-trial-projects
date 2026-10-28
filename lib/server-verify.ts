import { keccak_256 } from "@noble/hashes/sha3";
import { WOTSPlus } from "@quip.network/hashsigs";
import {
  ALGORITHM,
  MAX_MESSAGE_BYTES,
  PUBLIC_KEY_BYTES,
  SIGNATURE_BYTES,
  SignatureEnvelope,
  VerificationResult,
  splitSignature,
} from "./protocol";

const textEncoder = new TextEncoder();
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function decodeBase64(value: unknown, field: string): Uint8Array {
  if (typeof value !== "string" || !BASE64_PATTERN.test(value)) {
    throw new Error(`${field} must be canonical base64`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) {
    throw new Error(`${field} must be canonical base64`);
  }
  return new Uint8Array(bytes);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function parseEnvelope(input: unknown): SignatureEnvelope {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;
  const allowed = new Set(["algorithm", "message", "publicKey", "signature"]);
  const unexpected = Object.keys(body).filter((key) => !allowed.has(key));
  if (unexpected.length) {
    throw new Error(`Unexpected field(s): ${unexpected.join(", ")}`);
  }
  if (body.algorithm !== ALGORITHM) {
    throw new Error(`algorithm must be ${ALGORITHM}`);
  }
  if (typeof body.message !== "string") {
    throw new Error("message must be a string");
  }

  const messageLength = textEncoder.encode(body.message).length;
  if (messageLength === 0 || messageLength > MAX_MESSAGE_BYTES) {
    throw new Error(`message must be 1-${MAX_MESSAGE_BYTES} UTF-8 bytes`);
  }

  if (typeof body.publicKey !== "string" || typeof body.signature !== "string") {
    throw new Error("publicKey and signature must be base64 strings");
  }

  return {
    algorithm: ALGORITHM,
    message: body.message,
    publicKey: body.publicKey,
    signature: body.signature,
  };
}

export function verifyEnvelope(input: unknown): VerificationResult {
  const envelope = parseEnvelope(input);
  const publicKey = decodeBase64(envelope.publicKey, "publicKey");
  const signatureBytes = decodeBase64(envelope.signature, "signature");

  if (publicKey.length !== PUBLIC_KEY_BYTES) {
    throw new Error(`publicKey must decode to ${PUBLIC_KEY_BYTES} bytes`);
  }
  if (signatureBytes.length !== SIGNATURE_BYTES) {
    throw new Error(`signature must decode to ${SIGNATURE_BYTES} bytes`);
  }

  const messageHash = keccak_256(textEncoder.encode(envelope.message));
  const wots = new WOTSPlus(keccak_256);
  const valid = wots.verify(publicKey, messageHash, splitSignature(signatureBytes));

  return {
    valid,
    algorithm: ALGORITHM,
    messageHash: bytesToHex(messageHash),
    publicKeyBytes: publicKey.length,
    signatureBytes: signatureBytes.length,
  };
}
