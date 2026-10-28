// Thin glue between the two Quip products that don't meet in the middle:
//   - @quip.network/hashsigs-wasm  (signs 32-byte messages, returns a "stateful envelope")
//   - the on-chain ERC-7913 SHRINCS verifier (verify(key=32B commitment, hash, sig=envelope))
// Empirically (see DEVLOG #25) the verifier accepts hashsigs-wasm `shrincs.sign(hash32)` over the RAW 32-byte hash;
// do NOT pre-apply ethereum-sdk's statefulRawMessageHash - the deployed verifier rejects that.
import { hexToBytes, bytesToHex, type Address, type Hex } from "viem";

/** Deployed ERC-7913 SHRINCS verifier (profile shrincs-256s-keccak), identical on Base/Base Sepolia/OP Sepolia. */
export const SHRINCS_VERIFIER: Address = "0xF2f9E6D692da41b089c3c261c41509669eEc5567";

export const verifierAbi = [{ type: "function", name: "verify", stateMutability: "view",
  inputs: [{ name: "key", type: "bytes" }, { name: "hash", type: "bytes32" }, { name: "signature", type: "bytes" }],
  outputs: [{ type: "bytes4" }] }] as const;
export const ERC7913_MAGIC: Hex = "0x024ad318";
export { hexToBytes, bytesToHex };
