// Probe: does the deployed SHRINCS ERC-7913 verifier on Base Sepolia accept a hashsigs-wasm signature,
// and over which message hash (raw vs. statefulRawMessageHash)?  Read-only eth_call; no funds needed.
import { createPublicClient, http, bytesToHex, hexToBytes, keccak256, toHex, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { loadHashSigs } from "@quip.network/hashsigs-wasm";

const RPC = process.env.RPC_URL ?? "https://sepolia.base.org";
const VERIFIER = "0xF2f9E6D692da41b089c3c261c41509669eEc5567";
const abi = [{ type: "function", name: "verify", stateMutability: "view",
  inputs: [{ name: "key", type: "bytes" }, { name: "hash", type: "bytes32" }, { name: "signature", type: "bytes" }],
  outputs: [{ type: "bytes4" }] }] as const;

const { shrincs, profileName } = await loadHashSigs();
console.log("profile", profileName);
const seed = crypto.getRandomValues(new Uint8Array(32));
const keys = shrincs.keygen(seed, 64);
const commitment = bytesToHex(keys.publicKeyCommitment);
console.log("commitment", commitment);

const client = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const hash = keccak256(toHex("probe-message")) as Hex;
for (const [label, msg] of [
  ["raw hash", hash],
  ["keccak(hash) (wrong message)", keccak256(hash)],
] as const) {
  const k = shrincs.keygen(seed, 64); // fresh copy: sign() is stateful, don't reuse a leaf across experiments (throwaway anyway)
  const sig = shrincs.sign(hexToBytes(msg), k);
  const out = await client.readContract({ address: VERIFIER, abi, functionName: "verify", args: [commitment as Hex, hash, bytesToHex(sig)] }).catch(e => "REVERT " + e.shortMessage);
  console.log(label, "-> sig bytes", sig.length, "verifier returned", out, "(magic 0x024ad318 = valid)");
}
