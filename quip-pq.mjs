#!/usr/bin/env node
// Quip post-quantum account PoC CLI.
//
// Creates a Quip Account (SHRINCS hash-based post-quantum smart-contract wallet,
// @quip.network/ethereum-sdk@0.3.0-beta.8), funds it from a throwaway EOA, and
// withdraws part of it back to a normal (EOA) address via a PQ-signed execute().
//
// Usage:
//   node quip-pq.mjs init                 # generate throwaway keys in ./keys
//   node quip-pq.mjs create               # deploy the Quip Account via WalletFactory
//   node quip-pq.mjs fund <eth>           # owner EOA -> Quip Account
//   node quip-pq.mjs withdraw <eth> [to]  # Quip Account -> normal address (PQ-signed)
//   node quip-pq.mjs status
//   node quip-pq.mjs tamper-check [eth]  # simulate a tampered execute; must revert
//   node quip-pq.mjs all [fundEth] [withdrawEth]
//
// Env: RPC_URL (default https://sepolia.base.org; Quip Aglais testnet:
//      https://evm-rpc.aglais.quip.network:20049/), EXPLORER (tx URL prefix),
//      KEYS_DIR (default ./keys).

import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEther,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  ShrincsFactoryClient,
  ShrincsSigner,
  ShrincsWalletClient,
  generateMnemonic,
} from "@quip.network/ethereum-sdk/v1/shrincs";

let SYM = "ETH";
const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const KEYS_DIR = process.env.KEYS_DIR ?? path.resolve("keys");
const EXPLORERS = {
  84532: "https://sepolia.basescan.org/tx/",
  11155420: "https://sepolia-optimism.etherscan.io/tx/",
  20033: "https://explorer.aglais.quip.network/tx/", // Quip Aglais testnet
};
// Main SHRINCS key and ERC-1271 key must live on different trees.
const MAIN_INDEX = 0;
const ERC1271_INDEX = 1;
const MAX_SIGNATURES = Number(process.env.MAX_SIGNATURES ?? 16);

const keyFile = (name) => path.join(KEYS_DIR, name);
const readJson = (name) => JSON.parse(fs.readFileSync(keyFile(name), "utf8"));
const writeJson = (name, obj) =>
  fs.writeFileSync(keyFile(name), JSON.stringify(obj, null, 2) + "\n", { mode: 0o600 });

function init() {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
  const make = (name, fn) => {
    if (fs.existsSync(keyFile(name))) return console.log(`keep   ${keyFile(name)}`);
    writeJson(name, fn());
    console.log(`create ${keyFile(name)}`);
  };
  make("owner.json", () => {
    const pk = generatePrivateKey();
    return { privateKey: pk, address: privateKeyToAccount(pk).address };
  });
  make("recipient.json", () => {
    const pk = generatePrivateKey();
    return { privateKey: pk, address: privateKeyToAccount(pk).address };
  });
  make("shrincs.json", () => ({ mnemonic: generateMnemonic() }));
  console.log(`owner EOA (fund this with testnet ETH): ${readJson("owner.json").address}`);
  console.log(`recipient (normal address):             ${readJson("recipient.json").address}`);
}

async function ctx() {
  const owner = privateKeyToAccount(readJson("owner.json").privateKey);
  const publicClient = createPublicClient({ transport: http(RPC_URL) });
  // Big-weight txs on Aglais can take several minutes to be included; give the
  // SDK's internal receipt waits a longer timeout.
  const wait = publicClient.waitForTransactionReceipt;
  publicClient.waitForTransactionReceipt = (args) =>
    wait({ timeout: 900_000, pollingInterval: 4_000, ...args });
  const chainId = await publicClient.getChainId();
  const chain = {
    id: chainId,
    name: `chain-${chainId}`,
    nativeCurrency: { name: chainId === 20033 ? "QUIP" : "ETH", symbol: chainId === 20033 ? "QUIP" : "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
  };
  const walletClient = createWalletClient({ account: owner, chain, transport: http(RPC_URL) });
  // Workaround: the SDK passes `account: <address string>` to writeContract /
  // sendTransaction, which makes viem fall back to eth_sendTransaction on the
  // RPC node (a browser-wallet assumption). Rebind to the local key so the tx
  // is signed locally and sent with eth_sendRawTransaction.
  for (const m of ["writeContract", "sendTransaction"]) {
    const orig = walletClient[m];
    walletClient[m] = (args) =>
      orig({ ...args, account: typeof args?.account === "string" ? owner : args?.account ?? owner });
  }
  const signer = await ShrincsSigner.fromMnemonic(readJson("shrincs.json").mnemonic);
  if (chainId === 20033) SYM = "QUIP";
  const explorer = process.env.EXPLORER ?? EXPLORERS[chainId] ?? "";
  return { owner, publicClient, walletClient, chainId, signer, explorer };
}

function printTx(label, c, receipt) {
  console.log(`${label}: ${receipt.transactionHash} (status=${receipt.status}, block=${receipt.blockNumber})`);
  if (c.explorer) console.log(`  ${c.explorer}${receipt.transactionHash}`);
  if (receipt.status !== "success") throw new Error(`${label} reverted`);
}

// Quip has not deployed the Quip Account contracts on its own Aglais testnet;
// aglais-deploy.mjs redeploys Quip's Base Sepolia bytecode there and records the
// addresses. On Base/OP Sepolia the SDK's canonical addresses are used.
function deploymentOverrides(c) {
  const f = keyFile("aglais-deployment.json");
  if (!fs.existsSync(f)) return {};
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  if (d.chainId !== c.chainId) return {};
  return { factoryAddress: d.factory, walletImplementation: d.walletImpl };
}

function factoryFor(c) {
  return new ShrincsFactoryClient({
    publicClient: c.publicClient,
    walletClient: c.walletClient,
    account: c.owner.address,
    chainId: c.chainId,
    ...deploymentOverrides(c),
  });
}

async function openWallet(c) {
  const st = readJson("account.json");
  if (st.chainId !== c.chainId) throw new Error(`account.json is for chain ${st.chainId}, RPC is ${c.chainId}`);
  return new ShrincsWalletClient({
    walletAddress: st.walletAddress,
    publicClient: c.publicClient,
    walletClient: c.walletClient,
    signer: c.signer,
    commitment: st.commitment,
    derivationIndex: MAIN_INDEX,
    chainId: c.chainId,
    account: c.owner.address,
  });
}

async function create() {
  const c = await ctx();
  if (fs.existsSync(keyFile("account.json"))) {
    const st = readJson("account.json");
    if (st.chainId === c.chainId) return console.log(`Quip Account already created: ${st.walletAddress}`);
  }
  const bal = await c.publicClient.getBalance({ address: c.owner.address });
  console.log(`chain ${c.chainId}, owner ${c.owner.address} balance ${formatEther(bal)} ${SYM}`);
  const factory = factoryFor(c);
  const params = {
    signer: c.signer,
    maxSignatures: MAX_SIGNATURES,
    derivationIndex: MAIN_INDEX,
    erc1271: { derivationIndex: ERC1271_INDEX },
  };
  const est = await factory.estimateCreationCost(params);
  console.log(`creation fee ${formatEther(est.creationFee)} ${SYM}, est. gas ${est.gasUnits} @ ${est.gasPrice} wei = ${formatEther(est.gasUnits * est.gasPrice)} ${SYM}`);
  // createShrincsWallet returns the wallet client, not the tx hash; capture the
  // hash by wrapping writeContract.
  let deployHash;
  const write = c.walletClient.writeContract;
  c.walletClient.writeContract = async (args) => (deployHash = await write(args));
  const wallet = await factory.createShrincsWallet(params);
  c.walletClient.writeContract = write;
  printTx("create Quip Account", c, await c.publicClient.getTransactionReceipt({ hash: deployHash }));
  const st = {
    chainId: c.chainId,
    walletAddress: wallet.walletAddress,
    commitment: wallet.commitment,
    owner: c.owner.address,
    maxSignatures: MAX_SIGNATURES,
    deployTx: deployHash,
  };
  writeJson("account.json", st);
  console.log(`Quip Account (post-quantum wallet): ${wallet.walletAddress}`);
  console.log(`commitment: ${wallet.commitment}`);
  const s = await wallet.getWalletState();
  console.log(`owner=${s.owner} remainingStatefulSignatures=${s.remainingStatefulSignatures}`);
  return c;
}

async function fund(amountEth) {
  const c = await ctx();
  const { walletAddress } = readJson("account.json");
  const hash = await c.walletClient.sendTransaction({ to: walletAddress, value: parseEther(amountEth) });
  const receipt = await c.publicClient.waitForTransactionReceipt({ hash });
  printTx(`fund ${amountEth} ${SYM} -> ${walletAddress}`, c, receipt);
}

async function withdraw(amountEth, to) {
  const c = await ctx();
  const target = to ?? readJson("recipient.json").address;
  const wallet = await openWallet(c);
  const before = await c.publicClient.getBalance({ address: target });
  const acctBefore = await c.publicClient.getBalance({ address: wallet.walletAddress });
  // execute() signs (target, value, data, maxFee) with a one-time SHRINCS leaf
  // and is submitted by the owner EOA: both signatures are required on-chain.
  // The SDK's direct execute() attaches msg.value = value + maxFee from the
  // owner EOA, i.e. the EOA would pay the withdrawal. msg.value is not covered
  // by the SHRINCS signature, so trim it to just maxFee: the Quip Account then
  // pays `value` out of its own balance.
  const write = c.walletClient.writeContract;
  c.walletClient.writeContract = (args) =>
    write(args.functionName === "execute" ? { ...args, value: args.args.at(-1) } : args);
  const receipt = await wallet.execute({ target, value: parseEther(amountEth) });
  c.walletClient.writeContract = write;
  printTx(`withdraw ${amountEth} ${SYM} -> ${target} (SHRINCS-signed execute)`, c, receipt);
  const after = await c.publicClient.getBalance({ address: target });
  const acctAfter = await c.publicClient.getBalance({ address: wallet.walletAddress });
  console.log(`recipient balance    ${formatEther(before)} -> ${formatEther(after)} ${SYM}`);
  console.log(`Quip Account balance ${formatEther(acctBefore)} -> ${formatEther(acctAfter)} ${SYM}`);
}

// Negative test (simulation only, nothing is broadcast): sign an execute for
// `amountEth` with the real SHRINCS key, then tamper with the call so the
// owner EOA asks for 10x the amount. The contract must reject it: the classical
// owner key alone cannot move funds without a matching post-quantum signature.
async function tamperCheck(amountEth) {
  const c = await ctx();
  const target = readJson("recipient.json").address;
  const wallet = await openWallet(c);
  const write = c.walletClient.writeContract;
  let outcome;
  c.walletClient.writeContract = async (args) => {
    const a = [...args.args];
    a[3] = a[3] * 10n; // value
    try {
      await c.publicClient.simulateContract({ ...args, args: a, value: a.at(-1), account: c.owner });
      outcome = "ACCEPTED (unexpected!)";
    } catch (e) {
      outcome = `rejected as expected: ${e.shortMessage?.split("\n")[0] ?? e.message}`;
    }
    throw new Error("__simulated__");
  };
  await wallet.execute({ target, value: parseEther(amountEth) }).catch((e) => {
    if (!String(e?.message).includes("__simulated__") && !String(e?.cause?.message ?? "").includes("__simulated__")) throw e;
  });
  c.walletClient.writeContract = write;
  console.log(`tampered execute (signed ${amountEth}, submitted ${Number(amountEth) * 10}): ${outcome}`);
}

async function status() {
  const c = await ctx();
  console.log(`rpc ${RPC_URL} chain ${c.chainId}`);
  console.log(`owner EOA ${c.owner.address}: ${formatEther(await c.publicClient.getBalance({ address: c.owner.address }))} ${SYM}`);
  const r = readJson("recipient.json").address;
  console.log(`recipient ${r}: ${formatEther(await c.publicClient.getBalance({ address: r }))} ${SYM}`);
  if (!fs.existsSync(keyFile("account.json"))) return console.log("no Quip Account yet (run create)");
  const wallet = await openWallet(c);
  const s = await wallet.getWalletState();
  console.log(`Quip Account ${wallet.walletAddress}: ${formatEther(await c.publicClient.getBalance({ address: wallet.walletAddress }))} ${SYM}`);
  console.log(`  owner=${s.owner} keyVersion=${s.keyVersion} actionNonce=${s.actionNonce} leavesUsed=${s.statefulLeavesUsed}/${s.maxSignatures}`);
}

const [cmd, a1, a2] = process.argv.slice(2);
const run = {
  init: async () => init(),
  create,
  fund: () => fund(a1 ?? "0.002"),
  withdraw: () => withdraw(a1 ?? "0.001", a2),
  status,
  "tamper-check": () => tamperCheck(a1 ?? "0.0001"),
  all: async () => {
    init();
    await create();
    await fund(a1 ?? "0.002");
    await withdraw(a2 ?? "0.001");
    await status();
  },
}[cmd];
if (!run) {
  console.error("usage: node quip-pq.mjs init|create|fund <eth>|withdraw <eth> [to]|status|tamper-check [eth]|all [fundEth] [withdrawEth]");
  process.exit(1);
}
run().then(
  () => process.exit(0),
  (e) => {
    console.error("ERROR:", e?.shortMessage ?? e?.message ?? e);
    if (process.env.DEBUG) console.error(e);
    process.exit(1);
  },
);
