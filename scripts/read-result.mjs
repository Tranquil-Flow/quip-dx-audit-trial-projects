#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { Contract, JsonRpcProvider, sha256, toUtf8Bytes } from "ethers";

const root = path.resolve(import.meta.dirname, "..");
const rpcUrl = process.env.AGLAIS_EVM_RPC || "https://evm-rpc.aglais.quip.network:20049";
const deployment = JSON.parse(fs.readFileSync(path.join(root, "artifacts", "deployment.json"), "utf8"));
const compute = JSON.parse(fs.readFileSync(path.join(root, "artifacts", "compute-result.json"), "utf8"));
const compiled = JSON.parse(fs.readFileSync(path.join(root, "artifacts", "PortfolioResult.json"), "utf8"));
const provider = new JsonRpcProvider(rpcUrl, { chainId: 20033, name: "aglais" }, { staticNetwork: true });
const contract = new Contract(deployment.contract_address, compiled.abi, provider);
const [jobId, assetMask, energy, resultHash, recorder] = await contract.getResult();

// Python wrote keys in lexical order; this explicit insertion order reproduces
// its canonical JSON exactly without needing a general JSON canonicalizer.
const c = compute.canonical_result;
const canonical = JSON.stringify({
  asset_mask: c.asset_mask,
  energy: c.energy,
  job_id: c.job_id,
  selected_indices: c.selected_indices,
  selected_symbols: c.selected_symbols,
});
const localHash = sha256(toUtf8Bytes(canonical));
const checks = {
  job_id: jobId === BigInt(c.job_id),
  asset_mask: assetMask === BigInt(c.asset_mask),
  energy: energy === BigInt(c.energy),
  hash_matches_artifact: resultHash.toLowerCase() === compute.result_hash.toLowerCase(),
  canonical_hash_valid: localHash.toLowerCase() === resultHash.toLowerCase(),
};
if (!Object.values(checks).every(Boolean)) throw new Error(`verification failed: ${JSON.stringify(checks)}`);
const result = {
  contract_address: deployment.contract_address,
  job_id: jobId.toString(),
  asset_mask: Number(assetMask),
  selected_symbols: c.selected_symbols,
  energy: energy.toString(),
  result_hash: resultHash,
  recorder,
  checks,
};
console.log(JSON.stringify(result, null, 2));
