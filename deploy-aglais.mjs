#!/usr/bin/env node
// EXPERIMENT / WORKAROUND: Quip's own testnet (Aglais, chain 20033, pallet-revive
// EVM) has no Quip smart-account contracts. This re-deploys Quip's *own*
// source-verified bytecode (pulled from Base Sepolia Blockscout into
// vendor/bytecode/) onto Aglais with our throwaway key as factory owner, so the
// unmodified Quip SDK can be pointed at it via factoryAddress/walletImplementation.
// Output: keys/aglais-deployment.json
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  createPublicClient, createWalletClient, http, encodeAbiParameters,
  encodeFunctionData, parseEther, defineChain, concat,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { walletFactoryAbi } from "@quip.network/ethereum-sdk/v1";

export const aglais = defineChain({
  id: 20033, name: "Aglais (Quip testnet)",
  nativeCurrency: { name: "AGLS", symbol: "AGLS", decimals: 18 },
  rpcUrls: { default: { http: ["https://evm-rpc.aglais.quip.network:20049"] } },
  blockExplorers: { default: { name: "Aglais Explorer", url: "https://explorer.aglais.quip.network" } },
});
const OUT = "keys/aglais-deployment.json";
const account = privateKeyToAccount(JSON.parse(readFileSync("keys/eoa.json")).privateKey);
const pc = createPublicClient({ chain: aglais, transport: http() });
const wc = createWalletClient({ account, chain: aglais, transport: http() });
const state = existsSync(OUT) ? JSON.parse(readFileSync(OUT)) : {};
const save = () => writeFileSync(OUT, JSON.stringify(state, null, 2));

// Blockscout's creation_bytecode has the original constructor args appended; strip them.
function initcode(addr) {
  const d = JSON.parse(readFileSync(`vendor/bytecode/${addr}.json`));
  let code = d.creation_bytecode;
  const args = (d.constructor_args ?? "").replace(/^0x/, "");
  if (args && code.endsWith(args)) code = code.slice(0, code.length - args.length);
  return code;
}

async function deploy(name, data) {
  if (state[name]) { console.log(name, "already at", state[name]); return state[name]; }
  const bal0 = await pc.getBalance({ address: account.address });
  const hash = await wc.sendTransaction({ data, gas: undefined });
  const r = await pc.waitForTransactionReceipt({ hash, timeout: 900_000, pollingInterval: 5_000 });
  const cost = bal0 - (await pc.getBalance({ address: account.address }));
  console.log(`${name}: ${r.status} ${r.contractAddress} tx ${hash} (cost ${Number(cost) / 1e18} AGLS)`);
  if (r.status !== "success") throw new Error(`${name} deploy failed`);
  state[name] = r.contractAddress; state[`${name}Tx`] = hash; save();
  return r.contractAddress;
}

async function call(name, to, data) {
  if (state[`${name}Tx`]) { console.log(name, "already done"); return; }
  const hash = await wc.sendTransaction({ to, data });
  const r = await pc.waitForTransactionReceipt({ hash, timeout: 900_000, pollingInterval: 5_000 });
  console.log(`${name}: ${r.status} tx ${hash}`);
  if (r.status !== "success") throw new Error(`${name} failed`);
  state[`${name}Tx`] = hash; save();
}

const enc = (types, vals) => encodeAbiParameters(types.map((type) => ({ type })), vals).slice(2);

const verifier = await deploy("ShrincsVerifier", initcode("0xF2f9E6D692da41b089c3c261c41509669eEc5567"));
const factoryImpl = await deploy("WalletFactoryImpl",
  concat([initcode("0x77622e199DfF602f937fC5E5eB6479aE4b18161F"), `0x${enc(["uint256"], [parseEther("1")])}`]));
const init = encodeFunctionData({ abi: walletFactoryAbi, functionName: "initialize", args: [account.address] });
const factory = await deploy("WalletFactory",
  concat([initcode("0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8"), `0x${enc(["address", "bytes"], [factoryImpl, init])}`]));
const walletImpl = await deploy("ShrincsWalletImpl",
  concat([initcode("0xc4E4652898bB12C4f0Ba9083829689B1963135E7"), `0x${enc(["address", "address"], [factory, verifier])}`]));
await call("vetImplementation", factory,
  encodeFunctionData({ abi: walletFactoryAbi, functionName: "vetImplementation", args: [walletImpl] }));
console.log("latestWalletImpl:", await pc.readContract({ address: factory, abi: walletFactoryAbi, functionName: "latestWalletImpl" }));
console.log(state);
