// Generates test vectors signed OFF-CHAIN with the Quip WOTS+ scheme and writes
// them to test/testvectors/vectors.json for the Foundry tests to consume.
// Deterministic seeds on purpose (test vectors must be reproducible).
const fs = require("fs");
const path = require("path");
const { WOTSPlusNode, keccak_256, hex } = require("./wots-signer.js");

const wots = new WOTSPlusNode(keccak_256);

// Fixed, deterministic seeds (throwaway test keys — no value anywhere)
const VECTORS = [
  { label: "hello-quip", message: "Hello, Quip Network!" },
  { label: "attack-at-dawn", message: "attack at dawn: unit 7 retarget 52.3" },
  { label: "empty", message: "" },
  { label: "long", message: "A post-quantum attestation over a somewhat longer payload.".repeat(3) },
];

const out = [];
for (const v of VECTORS) {
  const privateSeed = wots.hash(Buffer.from(`quip-test-private-seed|${v.label}`));
  const publicSeed = wots.hash(Buffer.from(`quip-test-public-seed|${v.label}`));
  const { publicKey, publicKeyHash, privateKey } = wots.generateKeyPair(privateSeed, publicSeed);
  const msgBytes = Buffer.from(v.message, "utf8");
  const messageHash = keccak_256(msgBytes);
  const signature = wots.sign(privateKey, publicSeed, messageHash);

  // sanity: our off-chain verify agrees before handing to Solidity
  const selfOk = wots.verify(publicKey, messageHash, signature);
  if (!selfOk) throw new Error(`off-chain self-verify failed for ${v.label}`);

  out.push({
    label: v.label,
    message: msgBytes.toString("utf8"),
    messageHex: hex(msgBytes),
    messageHash: hex(messageHash),
    publicSeed: hex(publicSeed),
    publicKeyHash: hex(publicKeyHash),
    privateKey: hex(privateKey), // test-only, deterministic, no value
    signature: signature.map(hex),
  });
}

const dest = path.join(__dirname, "..", "test", "testvectors", "vectors.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(`wrote ${out.length} vectors -> ${dest}`);
for (const v of out)
  console.log(`  ${v.label}: pubKeyHash=${v.publicKeyHash.slice(0, 18)}… sig[0]=${v.signature[0].slice(0, 18)}…`);
