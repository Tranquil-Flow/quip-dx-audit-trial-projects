// Verifies every saved DAO payout approval (approvals/*.json) against the SHRINCS ERC-7913 verifier
// deployed on a LIVE network, via eth_call (no funds needed). Usage: RPC_URL=https://sepolia.base.org node verify-live.mjs
import fs from "node:fs";
import { createPublicClient, http, keccak256 } from "viem";
import { getShrincsAddresses } from "@quip.network/ethereum-sdk/v1/shrincs";
const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const pc = createPublicClient({ transport: http(RPC_URL) });
const chainId = await pc.getChainId();
// Aglais (20033) is not in the SDK registry (getShrincsAddresses throws UnsupportedNetworkError) → allow override.
const verifier = process.env.VERIFIER ?? getShrincsAddresses(chainId).ShrincsVerifier;
const abi = [{ type: "function", name: "verify", stateMutability: "view", inputs: [{ type: "bytes" }, { type: "bytes32" }, { type: "bytes" }], outputs: [{ type: "bytes4" }] }];
const block = await pc.getBlockNumber();
console.log(`chain ${chainId} via ${RPC_URL} @ block ${block}; verifier ${verifier}`);
for (const f of fs.readdirSync("approvals")) {
  const a = JSON.parse(fs.readFileSync(`approvals/${f}`, "utf8"));
  const ok = await pc.readContract({ address: verifier, abi, functionName: "verify", args: [a.approverCommitment, a.payoutHash, a.envelope], blockNumber: block });
  const bad = await pc.readContract({ address: verifier, abi, functionName: "verify", args: [a.approverCommitment, keccak256(a.payoutHash), a.envelope], blockNumber: block });
  console.log(`${a.payoutHash} leaf=${a.leaf} -> ${ok} ${ok === "0x024ad318" ? "VALID" : "INVALID"} | tampered -> ${bad}`);
}
