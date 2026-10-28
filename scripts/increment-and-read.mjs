import { Contract } from "ethers";
import { ARTIFACT_PATH, DEPLOYMENT_PATH, GAS_PRICE, assertChain, readJson, signer, writeJson } from "./config.mjs";

const wallet = signer();
assertChain(await wallet.provider.getNetwork());
const artifact = readJson(ARTIFACT_PATH);
const deployment = readJson(DEPLOYMENT_PATH);
const contract = new Contract(deployment.contractAddress, artifact.abi, wallet);

const before = await contract.count();
const tx = await contract.increment({ gasPrice: GAS_PRICE, type: 0 });
console.log(JSON.stringify({ stage: "submitted", hash: tx.hash, countBefore: before.toString() }, null, 2));
const receipt = await tx.wait(1);
if (!receipt || receipt.status !== 1) throw new Error(`Increment failed: ${tx.hash}`);
const after = await contract.count();
if (after !== before + 1n) throw new Error(`Unexpected count: before=${before}, after=${after}`);

const result = {
  ...deployment,
  incrementTransactionHash: tx.hash,
  incrementBlockNumber: receipt.blockNumber,
  incrementGasUsed: receipt.gasUsed.toString(),
  countBefore: before.toString(),
  countAfter: after.toString(),
  incrementedAt: new Date().toISOString()
};
writeJson(DEPLOYMENT_PATH, result);
console.log(JSON.stringify({
  contractAddress: deployment.contractAddress,
  incrementTransactionHash: tx.hash,
  countBefore: before.toString(),
  countAfter: after.toString(),
  blockNumber: receipt.blockNumber
}, null, 2));
