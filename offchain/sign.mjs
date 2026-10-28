// Off-chain Quip WOTS+ signer using Quip's official TypeScript library (@quip.network/hashsigs).
//
// Usage:
//   node sign.mjs <messageText> [outFile]
//
// - Generates a fresh WOTS+ keypair from CSPRNG seeds (one-time key! never sign twice with it)
// - Signs keccak256(messageText)
// - Self-verifies off-chain, then writes a JSON fixture consumed by Foundry tests / deploy script.
import { WOTSPlus } from "@quip.network/hashsigs";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const hex = (u8) => "0x" + Buffer.from(u8).toString("hex");

const messageText = process.argv[2] ?? "hello quip";
const outFile = process.argv[3];

const wots = new WOTSPlus(keccak_256);

const privateSeed = new Uint8Array(randomBytes(32));
const publicSeed = new Uint8Array(randomBytes(32));
const { publicKey, privateKey } = wots.generateKeyPair(privateSeed, publicSeed);

// The WOTS+ "message" is a 32-byte digest; hash the application message with keccak256.
const messageHash = keccak_256(new TextEncoder().encode(messageText));
const signature = wots.sign(privateKey, publicSeed, messageHash);

if (!wots.verify(publicKey, messageHash, signature)) throw new Error("off-chain self-verify failed");

const fixture = {
  messageText,
  messageHash: hex(messageHash),
  publicSeed: hex(publicKey.slice(0, 32)),
  publicKeyHash: hex(publicKey.slice(32, 64)),
  signature: signature.map(hex),
};
const json = JSON.stringify(fixture, null, 2);
if (outFile) {
  writeFileSync(outFile, json);
  // private key is kept only alongside the fixture for auditability; it is a throwaway one-time key.
  writeFileSync(outFile.replace(/\.json$/, ".secret.json"), JSON.stringify({ privateKey: hex(privateKey), publicSeed: hex(publicSeed) }, null, 2));
  console.error(`wrote ${outFile}`);
} else {
  process.stdout.write(json);
}
