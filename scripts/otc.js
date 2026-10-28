// scripts/otc.js
// Off-chain OTC desk primitives built on Quip's published signing library.
//
// Uses @quip.network/hashsigs (WOTS+ / Winternitz One-Time Signature+, the
// scheme Quip's QuipWallet verifies on-chain) exactly the way
// @quip.network/ethereum-sdk's QuipSigner does.
//
// An "order" is a canonical JSON object. The maker signs keccak256(canonical
// order) with their post-quantum key. The taker verifies the maker's
// signature and countersigns. The signed orders are persisted in ./orders
// and later bound to the on-chain settlement legs by the shared secret.
"use strict";
const { ethers } = require("ethers");
const { keccak_256 } = require("@noble/hashes/sha3");
const { WOTSPlus } = require("@quip.network/hashsigs");
const { randomBytes } = require("@noble/ciphers/webcrypto");
const { bytesToHex, hexToBytes } = require("@noble/hashes/utils");

const wots = new WOTSPlus(keccak_256);

// ---- canonicalization -----------------------------------------------------
// deterministic JSON: sorted keys, no whitespace
function canonicalize(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonicalize).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") +
    ")"
  );
}
function orderDigest(order) {
  return Buffer.from(keccak_256(Buffer.from(canonicalize(order), "utf8")));
}

// ---- keypair helpers (same derivation style as the SDK QuipSigner) -------
// WOTS+ is one-time: each signature consumes a publicSeed. We keep state in
// the keyfile so a party never signs twice with the same publicSeed.
function generateKeyPair(quantumSecret, vaultId, publicSeed) {
  const privateSeed = new Uint8Array([...quantumSecret, ...vaultId]);
  const kp = wots.generateKeyPair(privateSeed, publicSeed);
  return {
    privateKey: kp.privateKey,
    publicKey: {
      publicSeed: kp.publicKey.slice(0, 32),
      publicKeyHash: kp.publicKey.slice(32, 64),
    },
  };
}

function sign(messageBytes, quantumSecret, vaultId, publicSeed) {
  const kp = generateKeyPair(quantumSecret, vaultId, publicSeed);
  const sig = wots.sign(kp.privateKey, kp.publicKey.publicSeed, messageBytes);
  return {
    signature: sig.map((s) => Buffer.from(s).toString("hex")),
    publicSeed: Buffer.from(kp.publicKey.publicSeed).toString("hex"),
    publicKeyHash: Buffer.from(kp.publicKey.publicKeyHash).toString("hex"),
  };
}

function verify(messageBytes, publicSeedHex, publicKeyHashHex, signatureHexes) {
  const publicKey = new Uint8Array([
    ...hexToBytes(publicSeedHex),
    ...hexToBytes(publicKeyHashHex),
  ]);
  const sig = signatureHexes.map((s) => new Uint8Array(hexToBytes(s)));
  return wots.verify(publicKey, messageBytes, sig);
}

// ---- party identity -------------------------------------------------------
// A party's PQ identity = (quantumSecret, vaultId). The publicKeyHash of the
// next unused publicSeed is also the value committed on-chain as the Quip
// vault's pqOwner.publicKeyHash, which lets anyone cross-check that an
// off-chain order was signed by the key controlling the vault.
function partyId(quantumSecret, vaultId) {
  return ethers.hexlify(vaultId);
}

module.exports = {
  canonicalize,
  orderDigest,
  generateKeyPair,
  sign,
  verify,
  partyId,
  newQuantumSecret: () => randomBytes(32),
  newVaultId: () => randomBytes(32),
  newPublicSeed: () => randomBytes(32),
  toHex: (u8) => Buffer.from(u8).toString("hex"),
};
