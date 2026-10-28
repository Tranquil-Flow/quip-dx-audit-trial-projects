// scripts/01_create_signed_offers.js
//
// Off-chain leg of the OTC desk:
//   1. Alice (maker) drafts order terms and signs the canonical digest with
//      her post-quantum WOTS+ key (Quip's @quip.network/hashsigs library).
//   2. Bob (taker) verifies Alice's signature over the terms, then
//      countersigns the same digest with his post-quantum key.
//   3. Both signatures are verified by the script before anything is saved.
//   4. The shared secret (kept ONLY by the maker, like QuipSwap's "the
//      secret stays with you") is stored separately; the public lock =
//      keccak256(secret) goes in the signed order.
//
// Usage: node scripts/01_create_signed_offers.js <trade1|trade2>
"use strict";
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { keccak_256 } = require("@noble/hashes/sha3");
const otc = require("./otc");

const PROJ = path.resolve(__dirname, "..");
const arg = process.argv[2];
const WHICH = arg && arg.replace(/\.json$/, "") === "trade2" ? "trade2" : "trade1";

// ---- load / create party PQ key material --------------------------------
function loadOrCreateParty(name) {
  const p = path.join(PROJ, "keys", `${name}-pq.json`);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  const rec = {
    quantumSecret: otc.toHex(otc.newQuantumSecret()),
    vaultId: otc.toHex(otc.newVaultId()),
    seedsUsed: [], // publicSeeds already consumed (WOTS+ one-time discipline)
  };
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(rec, null, 2), { mode: 0o600 });
  return rec;
}

function nextUnusedSeed(party) {
  let seed;
  do {
    seed = otc.toHex(otc.newPublicSeed());
  } while (party.seedsUsed.includes(seed));
  party.seedsUsed.push(seed);
  return seed;
}

function saveParty(name, rec) {
  fs.writeFileSync(path.join(PROJ, "keys", `${name}-pq.json`), JSON.stringify(rec, null, 2), { mode: 0o600 });
}

function main() {
  const alice = loadOrCreateParty("alice");
  const bob = loadOrCreateParty("bob");

  const aliceEOA = JSON.parse(fs.readFileSync(path.join(PROJ, "keys", "alice.json"))).address;
  const bobEOA = JSON.parse(fs.readFileSync(path.join(PROJ, "keys", "bob.json"))).address;

  const now = Math.floor(Date.now() / 1000);

  // ---- terms -------------------------------------------------------------
  const trade = {
    id: `OTC-${WHICH}-${Date.now().toString(36)}`,
    version: 1,
    network: { chainId: 31337, name: "anvil-local", settlementLayer: "QuipSwap-style HTLC escrow" },
    maker: {
      role: "maker",
      address: aliceEOA, // EOA that owns the Quip vault; vault addr filled in at deploy
      gives: { asset: "ETH", amount: WHICH === "trade1" ? "0.5" : "0.3" },
      wants: { asset: "ETH", amount: WHICH === "trade1" ? "0.25" : "0.15" },
    },
    taker: {
      role: "taker",
      address: bobEOA,
      gives: { asset: "ETH", amount: WHICH === "trade1" ? "0.25" : "0.15" },
      wants: { asset: "ETH", amount: WHICH === "trade1" ? "0.5" : "0.3" },
    },
    // deadline model: initiator (maker) holds the LONGER window; the
    // counterparty the SHORTER one, per QuipSwap's asymmetric windows.
    deadlines: {
      initiatorReclaimDeadline: WHICH === "trade1" ? now + 3600 : now + 120,
      counterpartyReclaimDeadline: WHICH === "trade1" ? now + 1800 : now + 60,
    },
    lock: null, // keccak256(secret), filled below
    nonce: Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    createdAt: now,
  };

  // ---- secret (maker-only knowledge) -------------------------------------
  const secret = otc.toHex(otc.newPublicSeed()); // 32 random bytes
  trade.lock = Buffer.from(keccak_256(Buffer.from(secret, "hex"))).toString("hex");

  // ---- maker signs -------------------------------------------------------
  const digest = otc.orderDigest(trade); // canonical, excludes signatures
  const makerSeed = nextUnusedSeed(alice);
  const makerSig = otc.sign(
    digest,
    Buffer.from(alice.quantumSecret, "hex"),
    Buffer.from(alice.vaultId, "hex"),
    Buffer.from(makerSeed, "hex")
  );
  saveParty("alice", alice);

  // ---- taker verifies maker sig, then countersigns -----------------------
  const makerOk = otc.verify(
    digest,
    makerSig.publicSeed,
    makerSig.publicKeyHash,
    makerSig.signature
  );
  if (!makerOk) throw new Error("Maker signature failed verification");

  const takerSeed = nextUnusedSeed(bob);
  const takerSig = otc.sign(
    digest,
    Buffer.from(bob.quantumSecret, "hex"),
    Buffer.from(bob.vaultId, "hex"),
    Buffer.from(takerSeed, "hex")
  );
  saveParty("bob", bob);

  // ---- final self-check of BOTH signatures --------------------------------
  const takerOk = otc.verify(
    digest,
    takerSig.publicSeed,
    takerSig.publicKeyHash,
    takerSig.signature
  );
  if (!takerOk) throw new Error("Taker signature failed verification");

  const signed = {
    ...trade,
    makerSig: { scheme: "WOTS+ (Winternitz OTS), keccak256, w=16", ...makerSig },
    takerSig: { scheme: "WOTS+ (Winternitz OTS), keccak256, w=16", ...takerSig },
  };
  const orderPath = path.join(PROJ, "orders", `${WHICH}.json`);
  fs.mkdirSync(path.dirname(orderPath), { recursive: true });
  fs.writeFileSync(orderPath, JSON.stringify(signed, null, 2));

  const secretPath = path.join(PROJ, "orders", `${WHICH}.secret.json`);
  fs.writeFileSync(secretPath, JSON.stringify({ secret, heldBy: "maker" }, null, 2), { mode: 0o600 });

  console.log("digest:", digest.toString("hex"));
  console.log("lock  :", trade.lock);
  console.log("maker signature verified:", makerOk, "(publicKeyHash " + makerSig.publicKeyHash.slice(0, 16) + "…)");
  console.log("taker signature verified:", takerOk, "(publicKeyHash " + takerSig.publicKeyHash.slice(0, 16) + "…)");
  console.log("signed order ->", orderPath);
  console.log("secret       ->", secretPath, "(maker only, 0600)");
}

main();
