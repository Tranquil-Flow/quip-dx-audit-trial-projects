import fs from "node:fs";
import path from "node:path";
import { Contract } from "ethers";
import { ARTIFACT_PATH, DEPLOYMENT_PATH, EXPLORER_URL, assertChain, provider, readJson, writeJson } from "./config.mjs";

const rpc = provider();
assertChain(await rpc.getNetwork());
const deployment = readJson(DEPLOYMENT_PATH);
const artifact = readJson(ARTIFACT_PATH);
const [deploymentReceipt, incrementReceipt, code] = await Promise.all([
  rpc.getTransactionReceipt(deployment.deploymentTransactionHash),
  rpc.getTransactionReceipt(deployment.incrementTransactionHash),
  rpc.getCode(deployment.contractAddress)
]);
if (!deploymentReceipt || deploymentReceipt.status !== 1) throw new Error("Deployment receipt missing or failed");
if (!incrementReceipt || incrementReceipt.status !== 1) throw new Error("Increment receipt missing or failed");
if (deploymentReceipt.contractAddress?.toLowerCase() !== deployment.contractAddress.toLowerCase()) {
  throw new Error("Deployment receipt contract address mismatch");
}
if (code === "0x") throw new Error("Contract bytecode missing");
const count = await new Contract(deployment.contractAddress, artifact.abi, rpc).count();
if (count < 1n) throw new Error(`Counter value should be at least 1, got ${count}`);

async function explorerTransaction(hash) {
  const response = await fetch(`${EXPLORER_URL}/api/v2/transactions/${hash}`);
  if (!response.ok) throw new Error(`Explorer returned HTTP ${response.status} for ${hash}`);
  const value = await response.json();
  if (value.status !== "ok") throw new Error(`Explorer transaction is not ok: ${hash}`);
  return { hash: value.hash, status: value.status, blockNumber: value.block_number };
}
const [explorerDeployment, explorerIncrement] = await Promise.all([
  explorerTransaction(deployment.deploymentTransactionHash),
  explorerTransaction(deployment.incrementTransactionHash)
]);

const evidence = {
  verifiedAt: new Date().toISOString(),
  chainId: deployment.chainId,
  contractAddress: deployment.contractAddress,
  bytecodeBytes: (code.length - 2) / 2,
  count: count.toString(),
  rpc: {
    deployment: { hash: deploymentReceipt.hash, status: deploymentReceipt.status, blockNumber: deploymentReceipt.blockNumber },
    increment: { hash: incrementReceipt.hash, status: incrementReceipt.status, blockNumber: incrementReceipt.blockNumber }
  },
  explorer: { deployment: explorerDeployment, increment: explorerIncrement }
};
writeJson(path.resolve("evidence", "verification.json"), evidence);
console.log(JSON.stringify(evidence, null, 2));
