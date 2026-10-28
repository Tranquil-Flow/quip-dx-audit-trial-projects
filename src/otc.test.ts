// Offline tests for the PQ order layer (no chain). Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { keccak256, toHex, type Hex } from "viem";
import { PqSigner, verifyPq } from "./pqkeys.ts";
import { acceptOffer, checkAcceptance, signOffer, termsFromOffer, offerHash, type Offer } from "./otc.ts";

const maker = new PqSigner("test-maker"), taker = new PqSigner("test-taker"), mallory = new PqSigner("test-mallory");
const A = "0x00000000000000000000000000000000000000a1", B = "0x00000000000000000000000000000000000000b2";
const mk = (o: Partial<Offer> = {}): Offer => ({ chainId: 84532n, omnibus: "0xA7955981D5759a799267063110Be0F7AeCc26F8A",
  lock: keccak256(toHex("lock")), maker: { eoa: A, pq: maker.commitment }, taker: { eoa: B, pq: taker.commitment },
  sellToken: "0x00000000000000000000000000000000000000c3", sellAmount: 1000n, buyWei: 5n, validUntil: 1000n,
  schedule: [1000n, 1020n, 1040n, 1060n, 1080n, 1100n], salt: keccak256(toHex("salt")), ...o });

test("happy path: offer + acceptance verify", () => {
  const so = signOffer(maker, mk()); const acc = acceptOffer(taker, so, 10n); checkAcceptance(so, acc);
  const { proposer, taker: t } = termsFromOffer(so.offer);
  assert.equal(proposer.recipient, A); assert.equal(t.recipient, B);
});
test("tampered offer amount is rejected by taker", () => {
  const so = signOffer(maker, mk()); const bad = { ...so, offer: { ...so.offer, sellAmount: 1n } };
  assert.throws(() => acceptOffer(taker, bad, 10n), /hash mismatch/);
});
test("re-hashed tampered offer (attacker recomputes hash) fails PQ verify", () => {
  const so = signOffer(maker, mk()); const o2 = { ...so.offer, buyWei: 1n };
  assert.throws(() => acceptOffer(taker, { offer: o2, hash: offerHash(o2), makerSig: so.makerSig }, 10n), /INVALID/);
});
test("offer signed by a different PQ key is rejected", () => {
  assert.throws(() => signOffer(mallory, mk()), /not this signer/);
});
test("offer for another taker key is refused", () => {
  const so = signOffer(maker, mk()); assert.throws(() => acceptOffer(mallory, so, 10n), /not addressed/);
});
test("expired offer refused", () => {
  const so = signOffer(maker, mk()); assert.throws(() => acceptOffer(taker, so, 1000n), /expired/);
});
test("acceptance replayed against a different offer is rejected", () => {
  const so1 = signOffer(maker, mk()); const so2 = signOffer(maker, mk({ salt: keccak256(toHex("other")) }));
  const acc = acceptOffer(taker, so1, 10n); assert.throws(() => checkAcceptance(so2, acc), /different offer/);
});
test("signature does not verify under another key / message", () => {
  const h = keccak256(toHex("x")) as Hex; const s = maker.sign(h);
  assert.equal(verifyPq(s, h, maker.commitment), true);
  assert.equal(verifyPq(s, h, taker.commitment), false);
  assert.equal(verifyPq(s, keccak256(toHex("y")), maker.commitment), false);
});
