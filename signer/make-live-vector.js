// Creates a FRESH throwaway Quip WOTS+ key (saved to keys/), signs a message
// OFF-CHAIN, and writes test/testvectors/live.json for the on-chain live test.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WOTSPlusNode, keccak_256, hex } = require("./wots-signer.js");

const wots = new WOTSPlusNode(keccak_256);

// throwaway entropy for the live testnet demo (kept in ./keys per rules)
const privateSeed = crypto.randomBytes(32);
const publicSeed = crypto.randomBytes(32);
fs.writeFileSync(path.join(__dirname, "..", "keys", "live-wots-key.json"), JSON.stringify({
  note: "throwaway WOTS+ key for Aglais testnet demo — no value, one-time use",
  privateSeed: hex(privateSeed),
  publicSeed: hex(publicSeed),
}, null, 2));

const message = "Quip post-quantum attestation @ aglais testnet " + new Date().toISOString();
const msgBytes = Buffer.from(message, "utf8");
const messageHash = keccak_256(msgBytes);

const { publicKey, publicKeyHash, privateKey } = wots.generateKeyPair(privateSeed, publicSeed);
const signature = wots.sign(privateKey, publicSeed, messageHash);
if (!wots.verify(publicKey, messageHash, signature)) throw new Error("off-chain self-verify failed");

// a deliberately tampered signature (flip a bit in element 5)
const tampered = signature.slice();
tampered[5] = Buffer.from(Buffer.from(tampered[5]).map((b, i) => (i === 0 ? b ^ 0x01 : b)));

const out = {
  message,
  messageHex: hex(msgBytes),
  messageHash: hex(messageHash),
  publicSeed: hex(publicSeed),
  publicKeyHash: hex(publicKeyHash),
  signature: signature.map(hex),
  tamperedSignature: tampered.map(hex),
};
const dest = path.join(__dirname, "..", "test", "testvectors", "live.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log("live vector written:", dest);
console.log("  message      :", message);
console.log("  publicKeyHash:", out.publicKeyHash);
