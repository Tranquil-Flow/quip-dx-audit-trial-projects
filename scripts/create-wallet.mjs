import fs from "node:fs";
import { Wallet } from "ethers";
import { KEY_PATH, writeJson } from "./config.mjs";

if (fs.existsSync(KEY_PATH)) {
  throw new Error(`Refusing to overwrite existing throwaway key: ${KEY_PATH}`);
}

const wallet = Wallet.createRandom();
writeJson(KEY_PATH, {
  warning: "THROWAWAY AGLAIS TESTNET KEY ONLY — NEVER FUND WITH REAL ASSETS",
  address: wallet.address,
  privateKey: wallet.privateKey
}, 0o600);

console.log(JSON.stringify({ keyFile: KEY_PATH, address: wallet.address }, null, 2));
