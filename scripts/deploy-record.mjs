#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";

const root = path.resolve(import.meta.dirname, "..");
const rpcUrl = process.env.AGLAIS_EVM_RPC || "https://evm-rpc.aglais.quip.network:20049";
const walletJson = JSON.parse(fs.readFileSync(path.join(root, "keys", "evm-wallet.json"), "utf8"));
const walletEntry = Array.isArray(walletJson) ? walletJson[0] : walletJson;
const compute = JSON.parse(fs.readFileSync(path.join(root, "artifacts", "compute-result.json"), "utf8"));
const compiled = JSON.parse(fs.readFileSync(path.join(root, "artifacts", "PortfolioResult.json"), "utf8"));

if (compute.network !== "aglais" || compute.canonical_result.job_id <= 0) {
  throw new Error("compute-result.json is not a real Aglais job result");
}

const provider = new JsonRpcProvider(rpcUrl, { chainId: 20033, name: "aglais" }, { staticNetwork: true });
const network = await provider.getNetwork();
if (network.chainId !== 20033n) throw new Error(`refusing non-Aglais chain ${network.chainId}`);
const wallet = new Wallet(walletEntry.private_key, provider);
const before = await provider.getBalance(wallet.address);
if (before === 0n) throw new Error(`throwaway EVM account ${wallet.address} is unfunded`);

const c = compute.canonical_result;
const factory = new ContractFactory(compiled.abi, compiled.bytecode, wallet);
const contract = await factory.deploy(c.job_id, c.asset_mask, c.energy, compute.result_hash);
const tx = contract.deploymentTransaction();
console.log(`deployment submitted: ${tx.hash}`);
const receipt = await tx.wait();
const address = await contract.getAddress();
if (!receipt || receipt.status !== 1) throw new Error("deployment reverted");

const deployment = {
  network: "aglais",
  chain_id: 20033,
  rpc_url: rpcUrl,
  deployer: wallet.address,
  contract_address: address,
  deployment_tx_hash: tx.hash,
  block_number: receipt.blockNumber,
  compute_job_id: c.job_id,
  asset_mask: c.asset_mask,
  energy: c.energy,
  result_hash: compute.result_hash,
};
fs.writeFileSync(path.join(root, "artifacts", "deployment.json"), JSON.stringify(deployment, null, 2) + "\n");
console.log(JSON.stringify(deployment, null, 2));
