import { loadHashSigs } from "@quip.network/hashsigs-wasm";

export const runtime = "nodejs";

const MAX_MESSAGE_CHARS = 4096;
const MAX_SIGNATURE_BYTES = 100_000;

function decodeBase64(value: unknown, field: string): Uint8Array {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be a non-empty base64 string`);
  }
  const buffer = Buffer.from(value, "base64");
  if (buffer.toString("base64").replace(/=+$/, "") !== value.replace(/=+$/, "")) {
    throw new Error(`${field} is not canonical base64`);
  }
  return new Uint8Array(buffer);
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.message !== "string" || body.message.length === 0) {
      return Response.json({ error: "message must be a non-empty string" }, { status: 400 });
    }
    if (body.message.length > MAX_MESSAGE_CHARS) {
      return Response.json({ error: `message exceeds ${MAX_MESSAGE_CHARS} characters` }, { status: 400 });
    }

    const signature = decodeBase64(body.signature, "signature");
    const publicKeyCommitment = decodeBase64(body.publicKeyCommitment, "publicKeyCommitment");
    if (signature.length > MAX_SIGNATURE_BYTES) {
      return Response.json({ error: "signature is too large" }, { status: 400 });
    }
    if (publicKeyCommitment.length !== 32) {
      return Response.json({ error: "publicKeyCommitment must be 32 bytes" }, { status: 400 });
    }

    // The server hashes the received text itself; it does not trust a client-supplied digest.
    const messageBytes = new TextEncoder().encode(body.message);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", messageBytes));
    const { profileName, shrincs } = await loadHashSigs();
    const valid = shrincs.verify(signature, digest, publicKeyCommitment);

    return Response.json({
      valid,
      profile: profileName,
      digestHex: hex(digest),
      signatureBytes: signature.length,
      commitmentHex: hex(publicKeyCommitment),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
