// signer/sign.js — CommonJS, runs on plain `node`.
// Off-chain WOTS+ signer using Quip's official @quip.network/hashsigs package.
// Generates a fresh keypair, signs keccak256(message), and writes a JSON
// file with everything Solidity/Foundry needs to call verify() on-chain.
//
// Usage:
//   node sign.js <out-file.json> "the message string"
//
// Output JSON shape:
//   {
//     message:       "0x...",  // 32-byte keccak256 of the message
//     messageText:   "...",
//     publicSeed:    "0x...",  // 32 bytes
//     publicKeyHash: "0x...",  // 32 bytes
//     privateKey:    "0x...",  // 32 bytes — KEEP SECRET.
//     signature:     ["0x...", ...]  // 67 chunks
//   }

const { WOTSPlus } = require("@quip.network/hashsigs");
const { keccak_256 } = require("@noble/hashes/sha3");
const { randomBytes } = require("node:crypto");
const { writeFileSync } = require("node:fs");
const path = require("node:path");

const outPath = process.argv[2];
const msgStr  = process.argv[3] || "hello quip testnet";

if (!outPath) {
  console.error("usage: node sign.js <out-file.json> [message]");
  process.exit(1);
}

const absOut = path.isAbsolute(outPath) ? outPath : path.resolve(process.cwd(), outPath);

const bytesToHex = (b) => "0x" + Buffer.from(b).toString("hex");

const w = new WOTSPlus((d) => keccak_256(d), 32, 16);

const privateSeed = new Uint8Array(randomBytes(32));
const publicSeed  = new Uint8Array(randomBytes(32));
const { publicKey, privateKey } = w.generateKeyPair(privateSeed, publicSeed);

const pkPublicSeed = publicKey.slice(0, 32);
const pkPublicHash = publicKey.slice(32);

const messageBytes = new TextEncoder().encode(msgStr);
const messageHash  = keccak_256(messageBytes);

const sigChunks = w.sign(privateKey, pkPublicSeed, messageHash);
if (sigChunks.length !== 67) throw new Error(`sig len ${sigChunks.length} != 67`);

const ok = w.verify(publicKey, messageHash, sigChunks);
if (!ok) throw new Error("local self-verify failed");

const out = {
  message:        bytesToHex(messageHash),
  messageText:    msgStr,
  publicSeed:     bytesToHex(pkPublicSeed),
  publicKeyHash:  bytesToHex(pkPublicHash),
  privateKey:     bytesToHex(privateKey),
  signature:      sigChunks.map(bytesToHex),
  constants: {
    chainLen: 16,
    numMessageChunks: 64,
    numChecksumChunks: 3,
    numSignatureChunks: 67,
    hashLen: 32,
  },
};

writeFileSync(absOut, JSON.stringify(out, null, 2));
console.log("wrote", absOut);
console.log("  messageHash:   " + out.message);
console.log("  publicSeed:    " + out.publicSeed);
console.log("  publicKeyHash: " + out.publicKeyHash);
console.log("  signature[0]:  " + out.signature[0]);
console.log("  signature[66]: " + out.signature[66]);