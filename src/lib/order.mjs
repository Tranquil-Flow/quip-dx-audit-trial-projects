// Canonical order terms + digest.
//
// The digest MUST byte-match OtcSettlement.canonicalDigest() so that one
// signature covers both legs of the trade no matter which side computes it
// (mirrors Quip's TermsLib.digestTermsCanonically, per the Oak Security audit
// of quip-swap-solidity). Symmetric: swapping leg A and leg B yields the same
// digest.
import { encodeAbiParameters, keccak256 } from "viem";

export const LEG_TUPLE = [
  { name: "chainId", type: "uint256" },
  { name: "token", type: "address" },
  { name: "amount", type: "uint256" },
  { name: "owner", type: "address" },
  { name: "payee", type: "address" },
];

// (Leg a, bytes32 secretHash, uint64 commitDeadline, uint64 executeDeadline,
//  uint64 reclaimRelease, uint256 nonce)
const DIGEST_PARAMS = [
  { name: "a", type: "tuple", components: LEG_TUPLE },
  { name: "secretHash", type: "bytes32" },
  { name: "commitDeadline", type: "uint64" },
  { name: "executeDeadline", type: "uint64" },
  { name: "reclaimRelease", type: "uint64" },
  { name: "nonce", type: "uint256" },
];

function legTuple(l) {
  return [BigInt(l.chainId), l.token, BigInt(l.amount), l.owner, l.payee];
}

export function legHash(leg) {
  return keccak256(
    encodeAbiParameters(
      [{ type: "tuple", components: LEG_TUPLE }],
      [legTuple(leg)]
    )
  );
}

export function canonicalDigest(terms) {
  const ha = keccak256(
    encodeAbiParameters(DIGEST_PARAMS, [
      legTuple(terms.a),
      terms.secretHash,
      BigInt(terms.commitDeadline),
      BigInt(terms.executeDeadline),
      BigInt(terms.reclaimRelease),
      BigInt(terms.nonce),
    ])
  );
  const hb = keccak256(
    encodeAbiParameters(DIGEST_PARAMS, [
      legTuple(terms.b),
      terms.secretHash,
      BigInt(terms.commitDeadline),
      BigInt(terms.executeDeadline),
      BigInt(terms.reclaimRelease),
      BigInt(terms.nonce),
    ])
  );
  const [lo, hi] = ha.toLowerCase() <= hb.toLowerCase() ? [ha, hb] : [hb, ha];
  return keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }], [lo, hi]));
}

/** The signed order envelope handed between the two parties off-chain. */
export function buildOrder({ terms, side, signer }) {
  return {
    version: "otc-order/1",
    protocol: "quipswap-compatible",
    chainId: terms.a.chainId,
    settlementContract: null, // filled in at commit time
    digest: canonicalDigest(terms),
    terms: {
      a: terms.a,
      b: terms.b,
      secretHash: terms.secretHash,
      commitDeadline: Number(terms.commitDeadline),
      executeDeadline: Number(terms.executeDeadline),
      reclaimRelease: Number(terms.reclaimRelease),
      nonce: terms.nonce.toString(),
    },
    signedBy: side,
    pqScheme: "SHRINCS-256s-keccak (Quip hashsigs-wasm)",
    pqPublicKeyCommitment: signer.commitment,
  };
}
