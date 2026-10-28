import { JsonRpcProvider, Wallet } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const RPC_URL = process.env.QUIP_RPC_URL ?? "https://evm-rpc.aglais.quip.network:20049";
export const CHAIN_ID = 20033;
export const GAS_PRICE = 1_000_000_000n;
export const EXPLORER_URL = "https://explorer.aglais.quip.network";
export const KEY_PATH = path.join(ROOT, "keys", "deployer.json");
export const ARTIFACT_PATH = path.join(ROOT, "artifacts", "Counter.json");
export const DEPLOYMENT_PATH = path.join(ROOT, "deployments", "aglais.json");

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJson(file, value, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
  fs.chmodSync(file, mode);
}

export function provider() {
  return new JsonRpcProvider(RPC_URL, { chainId: CHAIN_ID, name: "aglais" }, { staticNetwork: true });
}

export function signer() {
  if (!fs.existsSync(KEY_PATH)) {
    throw new Error(`Missing ${KEY_PATH}; run npm run wallet:new first`);
  }
  return new Wallet(readJson(KEY_PATH).privateKey, provider());
}

export function assertChain(network) {
  if (Number(network.chainId) !== CHAIN_ID) {
    throw new Error(`Refusing wrong chain: expected ${CHAIN_ID}, got ${network.chainId}`);
  }
}
