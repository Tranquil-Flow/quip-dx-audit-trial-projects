// signer/sign.ts
// Off-chain WOTS+ signer using Quip's official @quip.network/hashsigs package.
// Generates a fresh keypair, signs the keccak256 of an arbitrary message,
// and prints a JSON file consumable by Foundry's `cast` / my Solidity tests.

import { WOTSPlus } from "@quip.network/hashsigs";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { argv, exit } from "node:process";

function bytesToHex(b: Uint8Array): string {
  return "0x" + Buffer.from(b).toString("hex");
}
function hexToBytes(h: string): Uint8Array {
  const s = h.startsWith("0x") ? h.slice(2) : h;
  return new Uint8Array(Buffer.from(s, "hex"));
}

function main() {
  // Args: <out-file> [message-string]
  const outPath = argv[2];
  const msgStr  = argv[3] ?? "hello quip";
  if (!outPath) {
    console.error("usage: sign.ts <out-file> [message]");
    exit(1);
  }

  // Build a WOTS+ instance that uses keccak256 to match Quip's Solidity impl.
  // The constructor signature is (hashFn, hashLen=32, chainLen=16).
  const w = new WOTSPlus((d) => keccak_256(d), 32, 16);

  // Throwaway key: 32 random bytes for the privateSeed and the publicSeed.
  const privateSeed = randomBytes(32);
  const publicSeed  = randomBytes(32);

  // generateKeyPair(privateSeed, publicSeed) -> { publicKey (64 bytes = seed||pkHash), privateKey }
  const { publicKey, privateKey } = w.generateKeyPair(privateSeed, publicSeed);

  // publicKey layout (per source): [publicSeed(32) | publicKeyHash(32)]
  const pkPublicSeed = publicKey.slice(0, 32);
  const pkPublicHash = publicKey.slice(32);

  // What we actually sign is keccak256(message).
  const messageBytes = new TextEncoder().encode(msgStr);
  const messageHash  = keccak_256(messageBytes);

  const sigChunks = w.sign(privateKey, pkPublicSeed, messageHash);
  if (sigChunks.length !== 67) {
    throw new Error(`expected 67 chunks, got ${sigChunks.length}`);
  }

  // Sanity-check locally before exporting.
  const ok = w.verify(publicKey, messageHash, sigChunks);
  if (!ok) {
    throw new Error("local self-verify failed");
  }

  const out = {
    message:        bytesToHex(messageHash),
    messageText:    msgStr,
    publicSeed:     bytesToHex(pkPublicSeed),
    publicKeyHash:  bytesToHex(pkPublicHash),
    privateKey:     bytesToHex(privateKey),
    signature:      sigChunks.map(bytesToHex),
    // Helpful hints for downstream tooling
    constants: {
      chainLen: 16,
      numMessageChunks: 64,
      numChecksumChunks: 3,
      numSignatureChunks: 67,
      hashLen: 32,
    },
  };

  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`wrote ${outPath}`);
  console.log(`  publicKeyHash: ${out.publicKeyHash}`);
  console.log(`  messageHash:   ${out.message}`);
  console.log(`  sig[0]:        ${out.signature[0]}`);
  console.log(`  sig[66]:       ${out.signature[66]}`);
}

main();