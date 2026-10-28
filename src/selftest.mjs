// Local self-test: QuipSigner key recovery + WOTS+ sign/verify round trip
import { QuipSigner } from "@quip.network/solana-sdk";
import { WOTSPlus } from "@quip.network/hashsigs";
import { keccak_256 } from "@noble/hashes/sha3";
import { randomBytes } from "node:crypto";

async function main() {
  const quantumSecret = randomBytes(32);
  const vaultId = randomBytes(32);
  const signer = new QuipSigner(quantumSecret);

  // same as SDK's createWallet
  const kp1 = signer.generateKeyPair(vaultId);
  console.log("keypair 1 publicSeed:", Buffer.from(kp1.publicKey.publicSeed).toString("hex"));

  // same as SDK's transferWithWotsChunked message construction
  const kp2 = signer.generateKeyPair(vaultId);
  const to = randomBytes(32);
  const amountBuffer = Buffer.allocUnsafe(8);
  amountBuffer.writeBigUInt64LE(1000000000n, 0);
  const messageData = Buffer.concat([
    Buffer.from(kp1.publicKey.publicSeed),
    Buffer.from(kp1.publicKey.publicKeyHash),
    Buffer.from(kp2.publicKey.publicSeed),
    Buffer.from(kp2.publicKey.publicKeyHash),
    to,
    amountBuffer,
  ]);
  const messageHash = keccak_256(messageData);
  const signature = signer.sign(messageHash, vaultId, kp1.publicKey.publicSeed);
  console.log("WOTS+ signature elements:", signature.length, "x 32B =", signature.length * 32, "bytes");

  // verify like the on-chain program would
  const wots = new WOTSPlus(keccak_256);
  const pk = Buffer.concat([Buffer.from(kp1.publicKey.publicSeed), Buffer.from(kp1.publicKey.publicKeyHash)]);
  const ok = wots.verify(pk, messageHash, signature);
  console.log("verify round-trip:", ok ? "OK" : "FAIL");

  // deterministic recovery (what getWallet checks): same vault+seed -> same hash
  const recovered = signer.recoverKeyPair(vaultId, kp1.publicKey.publicSeed);
  const same = Buffer.from(recovered.publicKey.publicKeyHash).equals(Buffer.from(kp1.publicKey.publicKeyHash));
  console.log("deterministic recovery:", same ? "OK" : "FAIL");

  // one-time property: signing a second, different message with same key is possible locally (WOTS+ weakness)
  // — the on-chain program enforces rotation; we must rotate. Just assert signer state is recoverable.
  process.exit(ok && same ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
