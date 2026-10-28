// Funds-free evidence against the REAL Base Sepolia deployment: simulate (eth_call + balance state override)
// a proposer `commit` authorised by a SHRINCS signature over the real Omnibus commit digest.
import { createPublicClient, http, encodeFunctionData, parseEther, toHex, keccak256, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { readFileSync } from "node:fs";
import { privateKeyToAccount } from "viem/accounts";
import { buildKeyedSigner, computeCommitDigest, createOmnibusClient, createTerms, generateSecret, nativeAsset, omnibusAbi, resolveDeployment } from "@quip.network/quip-swap-sdk";
import { PqSigner } from "./pqkeys.ts";
import { SHRINCS_VERIFIER } from "./pq.ts";

const RPC = process.env.LIVE_RPC ?? "https://sepolia.base.org";
const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const A = privateKeyToAccount(JSON.parse(readFileSync("keys/partyA.eoa.json", "utf8")).privateKey as Hex);
const B = privateKeyToAccount(JSON.parse(readFileSync("keys/partyB.eoa.json", "utf8")).privateKey as Hex);
const dep = resolveDeployment(84532n);
const pq = new PqSigner("partyA");
const now = (await pub.getBlock()).timestamp;
const { lock } = generateSecret();
const mk = (who: typeof A, o: bigint) => createTerms({ chainId: 84532n, reclaimRecipient: who.address, recipient: who.address,
  commitmentDeadline: now + 300n + o, claimDeadline: now + 600n + o, reclaimRelease: now + 900n + o, assets: [nativeAsset(parseEther("0.001"))] });
const party = mk(A, 0n), counterparty = createTerms({ ...mk(B, 100n) });
const signer = buildKeyedSigner(SHRINCS_VERIFIER, pq.commitment);
const digest = computeCommitDigest({ lock, party, counterparty, signer, omnibusAddress: dep.omnibusAddress });
const client = createOmnibusClient({ address: dep.omnibusAddress, publicClient: pub as any });
const live = await client.getCommitDigest(lock, party, counterparty, keccak256(signer));
console.log("chain", await pub.getChainId(), "block", await pub.getBlockNumber(), "omnibus", dep.omnibusAddress);
console.log("SDK digest == live on-chain commitDigest():", digest === live, digest);
const signature = pq.sign(digest);
const data = encodeFunctionData({ abi: omnibusAbi, functionName: "commit", args: [lock, party, counterparty, { signer, signature }] });
const call = (sig: Hex) => pub.call({ account: A.address, to: dep.omnibusAddress, value: parseEther("0.001"), data: encodeFunctionData({ abi: omnibusAbi, functionName: "commit", args: [lock, party, counterparty, { signer, signature: sig }] }),
  stateOverride: [{ address: A.address, balance: parseEther("1") }] });
try { await call(signature); console.log("VALID PQ signature: live Omnibus.commit simulation SUCCEEDED (would lock 0.001 ETH)"); } catch (e: any) { console.log("valid-sig simulation failed:", e.shortMessage ?? e.message); }
const bad = ("0x" + (signature.slice(2, 200) + (signature[200] === "0" ? "1" : "0") + signature.slice(201))) as Hex;
try { await call(bad); console.log("tampered signature: UNEXPECTEDLY succeeded"); } catch (e: any) { console.log("tampered PQ signature rejected:", (e.shortMessage ?? e.message).split("\n")[0], e.cause?.data ?? ""); }
void data; void toHex;
