import { Contract } from "ethers";
import { ARTIFACT_PATH, DEPLOYMENT_PATH, assertChain, provider, readJson } from "./config.mjs";

const rpc = provider();
assertChain(await rpc.getNetwork());
const artifact = readJson(ARTIFACT_PATH);
const deployment = readJson(DEPLOYMENT_PATH);
const code = await rpc.getCode(deployment.contractAddress);
if (code === "0x") throw new Error(`No contract bytecode at ${deployment.contractAddress}`);
const contract = new Contract(deployment.contractAddress, artifact.abi, rpc);
console.log(JSON.stringify({
  contractAddress: deployment.contractAddress,
  count: (await contract.count()).toString(),
  bytecodeBytes: (code.length - 2) / 2
}, null, 2));
