import { loadHashSigs } from "@quip.network/hashsigs-wasm";
import { createHash } from "node:crypto";
import { fromHex } from "@/lib/hex";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { message, signature, publicKeyCommitment } = await req.json();
  const { shrincs, profileName } = await loadHashSigs();
  // Never trust a client-supplied digest: recompute the 32-byte message ourselves.
  const message32 = createHash("sha256").update(String(message)).digest();
  const valid = shrincs.verify(
    fromHex(signature),
    new Uint8Array(message32),
    fromHex(publicKeyCommitment),
  );
  return Response.json({ valid, profileName });
}
