#!/usr/bin/env node
// Re-deploy the Quip Account (SHRINCS) contract stack onto Quip's Aglais testnet
// EVM (pallet-revive), because Quip has not deployed it there.
//
// Bytecode is the exact creation bytecode Quip deployed on Base Sepolia (V1.0.1
// generation), fetched from the Base Sepolia Blockscout API
// (/api/v2/smart-contracts/<addr>, cached in ./aglais/*.json). Only the
// constructor arguments are re-pointed at our own addresses:
//   - SHRINCS256sKeccak verifier        (no args)
//   - WalletFactory implementation      (maxFee = 1e18, unchanged)
//   - ERC1967Proxy for the factory      (impl, initialize(owner = our throwaway EOA))
//   - ShrincsWallet implementation      (factory proxy, verifier)
// then vetImplementation(walletImpl) as factory owner.
//
// Output: ./keys/aglais-deployment.json (read by quip-pq.mjs on chain 20033).

import fs from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC = process.env.RPC_URL ?? "https://evm-rpc.aglais.quip.network:20049/";
const EXPLORER = "https://explorer.aglais.quip.network/tx/";
const OUT = "keys/aglais-deployment.json";
const SRC = {
  verifier: "0xF2f9E6D692da41b089c3c261c41509669eEc5567",
  factoryImpl: "0x77622e199DfF602f937fC5E5eB6479aE4b18161F",
  factoryProxy: "0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8",
  walletImpl: "0xc4E4652898bB12C4f0Ba9083829689B1963135E7",
};

const creation = (addr) => {
  const d = JSON.parse(fs.readFileSync(`aglais/${addr}.json`, "utf8"));
  return { code: d.creation_bytecode, args: d.constructor_args ?? "" };
};
const stripArgs = ({ code, args }) => {
  const a = (args || "").replace(/^0x/, "");
  if (a && !code.toLowerCase().endsWith(a.toLowerCase())) throw new Error("constructor args not at end");
  return a ? code.slice(0, code.length - a.length) : code;
};

const owner = privateKeyToAccount(JSON.parse(fs.readFileSync("keys/owner.json", "utf8")).privateKey);
const pc = createPublicClient({ transport: http(RPC) });
const chainId = await pc.getChainId();
const chain = {
  id: chainId,
  name: "quip-aglais",
  nativeCurrency: { name: "QUIP", symbol: "QUIP", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};
const wc = createWalletClient({ account: owner, chain, transport: http(RPC) });
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { chainId, txs: {} };

async function deploy(key, bytecode) {
  if (out[key]) return console.log(`${key}: already at ${out[key]}`), out[key];
  const hash = await wc.sendTransaction({ data: bytecode });
  const r = await pc.waitForTransactionReceipt({ hash, timeout: 900_000, pollingInterval: 5_000 });
  if (r.status !== "success" || !r.contractAddress) throw new Error(`${key} deploy failed: ${hash}`);
  out[key] = r.contractAddress;
  out.txs[key] = hash;
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`${key}: ${r.contractAddress}  tx ${hash}\n  ${EXPLORER}${hash}`);
  return r.contractAddress;
}

const verifier = await deploy("verifier", stripArgs(creation(SRC.verifier)));
// factory impl creation bytecode ends with its maxFee arg (1e18); keep as-is.
const factoryImpl = await deploy("factoryImpl", creation(SRC.factoryImpl).code);
const proxyArgs = encodeAbiParameters(
  [{ type: "address" }, { type: "bytes" }],
  [factoryImpl, encodeFunctionData({ abi: parseAbi(["function initialize(address)"]), args: [owner.address] })],
);
// Blockscout reports no constructor_args for the proxy, so strip the known
// original (impl, initialize(Quip's owner)) encoding explicitly.
const oldProxyArgs = encodeAbiParameters(
  [{ type: "address" }, { type: "bytes" }],
  [SRC.factoryImpl, encodeFunctionData({ abi: parseAbi(["function initialize(address)"]), args: ["0xc68B64770Da7914DEb0EF238b048a0Bf3B5f6A26"] })],
);
const factory = await deploy(
  "factory",
  stripArgs({ code: creation(SRC.factoryProxy).code, args: oldProxyArgs }) + proxyArgs.slice(2),
);
const walletArgs = encodeAbiParameters([{ type: "address" }, { type: "address" }], [factory, verifier]);
const walletImpl = await deploy("walletImpl", stripArgs(creation(SRC.walletImpl)) + walletArgs.slice(2));

const fAbi = parseAbi([
  "function vetImplementation(address impl)",
  "function latestWalletImpl() view returns (address)",
  "function owner() view returns (address)",
]);
const latest = await pc.readContract({ address: factory, abi: fAbi, functionName: "latestWalletImpl" }).catch(() => null);
if (latest?.toLowerCase() !== walletImpl.toLowerCase()) {
  const hash = await wc.writeContract({ address: factory, abi: fAbi, functionName: "vetImplementation", args: [walletImpl] });
  const r = await pc.waitForTransactionReceipt({ hash, timeout: 900_000, pollingInterval: 5_000 });
  out.txs.vet = hash;
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`vetImplementation: ${r.status} tx ${hash}`);
}
console.log("factory owner", await pc.readContract({ address: factory, abi: fAbi, functionName: "owner" }));
console.log("latestWalletImpl", await pc.readContract({ address: factory, abi: fAbi, functionName: "latestWalletImpl" }));
