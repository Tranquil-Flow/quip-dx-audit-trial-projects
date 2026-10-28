// Off-chain OTC negotiation with post-quantum (SHRINCS) signatures.
//   1. Maker signs an Offer (RFQ with all terms + timing + hashlock).
//   2. Taker verifies it, then signs an Acceptance bound to the offer hash.
//   3. Both derive identical QuipSwap Terms from the agreed Offer (no further negotiation needed).
// Nothing in this file touches a chain except the optional on-chain double-check of signatures.
import { encodeAbiParameters, keccak256, toHex, type Address, type Hex } from "viem";
import { createTerms, erc20Asset, nativeAsset, type Terms } from "@quip.network/quip-swap-sdk";
import { PqSigner, verifyPq } from "./pqkeys.ts";

export interface Party { eoa: Address; pq: Hex /* SHRINCS publicKeyCommitment */ }
export interface Offer {
  chainId: bigint; omnibus: Address; lock: Hex;
  maker: Party; taker: Party;
  sellToken: Address; sellAmount: bigint;   // maker gives ERC-20 ...
  buyWei: bigint;                            // ... taker gives native ETH
  validUntil: bigint;                        // offer stops being acceptable after this (unix s)
  // [P.commitDL, T.commitDL, P.claimDL, T.claimDL, P.reclaimRelease, T.reclaimRelease]
  schedule: readonly [bigint, bigint, bigint, bigint, bigint, bigint];
  salt: Hex;
}
export interface SignedOffer { offer: Offer; hash: Hex; makerSig: Hex }
export interface SignedAcceptance { offerHash: Hex; taker: Party; hash: Hex; takerSig: Hex }

const OFFER_TAG = keccak256(toHex("QUIP-OTC-DESK:offer:v1"));
const ACCEPT_TAG = keccak256(toHex("QUIP-OTC-DESK:accept:v1"));

export function offerHash(o: Offer): Hex {
  return keccak256(encodeAbiParameters(
    [{ type: "bytes32" }, { type: "uint256" }, { type: "address" }, { type: "bytes32" },
     { type: "address" }, { type: "bytes32" }, { type: "address" }, { type: "bytes32" },
     { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" },
     { type: "uint256[6]" }, { type: "bytes32" }],
    [OFFER_TAG, o.chainId, o.omnibus, o.lock, o.maker.eoa, o.maker.pq, o.taker.eoa, o.taker.pq,
     o.sellToken, o.sellAmount, o.buyWei, o.validUntil, [...o.schedule], o.salt]));
}
export function acceptanceHash(offerH: Hex, taker: Party): Hex {
  return keccak256(encodeAbiParameters(
    [{ type: "bytes32" }, { type: "bytes32" }, { type: "address" }, { type: "bytes32" }],
    [ACCEPT_TAG, offerH, taker.eoa, taker.pq]));
}

export function signOffer(maker: PqSigner, offer: Offer): SignedOffer {
  if (maker.commitment !== offer.maker.pq) throw new Error("offer.maker.pq is not this signer's key");
  const hash = offerHash(offer);
  return { offer, hash, makerSig: maker.sign(hash) };
}

/** Taker-side checks, then PQ-sign the acceptance. `now` is passed in (chain time) so the check is testable. */
export function acceptOffer(taker: PqSigner, so: SignedOffer, now: bigint): SignedAcceptance {
  const o = so.offer;
  if (offerHash(o) !== so.hash) throw new Error("offer hash mismatch");
  if (!verifyPq(so.makerSig, so.hash, o.maker.pq)) throw new Error("maker's PQ signature on offer is INVALID");
  if (o.taker.pq !== taker.commitment) throw new Error("offer is not addressed to this taker key");
  if (now >= o.validUntil) throw new Error("offer expired (off-chain)");
  const hash = acceptanceHash(so.hash, o.taker);
  return { offerHash: so.hash, taker: o.taker, hash, takerSig: taker.sign(hash) };
}

/** Maker-side check of the acceptance before touching the chain. */
export function checkAcceptance(so: SignedOffer, acc: SignedAcceptance) {
  if (acc.offerHash !== so.hash) throw new Error("acceptance is for a different offer");
  if (acceptanceHash(acc.offerHash, acc.taker) !== acc.hash) throw new Error("acceptance hash mismatch");
  if (acc.taker.pq !== so.offer.taker.pq || acc.taker.eoa !== so.offer.taker.eoa) throw new Error("acceptor != named taker");
  if (!verifyPq(acc.takerSig, acc.hash, acc.taker.pq)) throw new Error("taker's PQ signature on acceptance is INVALID");
}

/** Deterministic Terms for both legs. proposer = maker (P), taker = T. */
export function termsFromOffer(o: Offer): { proposer: Terms; taker: Terms } {
  const [pC, tC, pCl, tCl, pR, tR] = o.schedule;
  return {
    proposer: createTerms({ chainId: o.chainId, reclaimRecipient: o.maker.eoa, recipient: o.maker.eoa,
      commitmentDeadline: pC, claimDeadline: pCl, reclaimRelease: pR, assets: [erc20Asset(o.sellToken, o.sellAmount)] }),
    taker: createTerms({ chainId: o.chainId, reclaimRecipient: o.taker.eoa, recipient: o.taker.eoa,
      commitmentDeadline: tC, claimDeadline: tCl, reclaimRelease: tR, assets: [nativeAsset(o.buyWei)] }),
  };
}
