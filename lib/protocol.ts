export const ALGORITHM = "WOTS+-KECCAK256-W16" as const;
export const HASH_BYTES = 32;
export const PUBLIC_KEY_BYTES = 64;
export const SIGNATURE_CHUNKS = 67;
export const SIGNATURE_BYTES = SIGNATURE_CHUNKS * HASH_BYTES;
export const MAX_MESSAGE_BYTES = 4096;

export type SignatureEnvelope = {
  algorithm: typeof ALGORITHM;
  message: string;
  publicKey: string;
  signature: string;
};

export type VerificationResult = {
  valid: boolean;
  algorithm: typeof ALGORITHM;
  messageHash: string;
  publicKeyBytes: number;
  signatureBytes: number;
};

export function flattenSignature(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length !== SIGNATURE_CHUNKS) {
    throw new Error(`Expected ${SIGNATURE_CHUNKS} signature chunks`);
  }

  const flat = new Uint8Array(SIGNATURE_BYTES);
  chunks.forEach((chunk, index) => {
    if (chunk.length !== HASH_BYTES) {
      throw new Error(`Signature chunk ${index} must be ${HASH_BYTES} bytes`);
    }
    flat.set(chunk, index * HASH_BYTES);
  });
  return flat;
}

export function splitSignature(flat: Uint8Array): Uint8Array[] {
  if (flat.length !== SIGNATURE_BYTES) {
    throw new Error(`Signature must be ${SIGNATURE_BYTES} bytes`);
  }

  return Array.from({ length: SIGNATURE_CHUNKS }, (_, index) =>
    flat.slice(index * HASH_BYTES, (index + 1) * HASH_BYTES),
  );
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}
