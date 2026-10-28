#!/usr/bin/env node
// quip-wallet — minimal post-quantum wallet CLI on top of Quip's own SDK
// (@quip.network/ethereum-sdk@beta, SHRINCS hash-based signatures).
//
// Network: Base Sepolia (84532) — the only testnet where the current Quip
// SHRINCS smart-account stack (WalletFactory + ShrincsWallet impl + verifier)
// is actually deployed. Override RPC with QUIP_RPC (e.g. an anvil fork).
//
// Commands:
//   init                       create throwaway EOA + SHRINCS mnemonic in ./keys
//   info                       print EOA, predicted smart-account address, balances
//   create                     deploy the post-quantum smart account via WalletFactory
//   fund <eth>                 send ETH from the EOA into the smart account
//   transfer <to> <eth> [--from-eoa]  PQ-sign (SHRINCS stateful leaf) + submit a transfer
//   status                     on-chain wallet state (leaves used, nonce, balance)
//   aglais-faucet              request Quip's own Aglais testnet faucet for the EOA
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import {
  createPublicClient, createWalletClient, http, custom, formatEther, parseEther,
  isAddress, getAddress, hexToBigInt, hexToNumber, defineChain,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  ShrincsSigner, ShrincsFactoryClient, generateMnemonic, getShrincsWalletAddress,
} from "@quip.network/ethereum-sdk/v1/shrincs";

const KEYS = "keys";
const EOA_FILE = `${KEYS}/eoa.json`;
const PQ_FILE = `${KEYS}/quip-shrincs.json`;
const STATE_FILE = `${KEYS}/wallet-state-${process.env.QUIP_NETWORK ?? "base-sepolia"}.json`;
// QUIP_NETWORK=base-sepolia (default): Quip's canonical deployment.
// QUIP_NETWORK=aglais: Quip's own testnet, using the contracts WE deployed with
// deploy-aglais.mjs (Quip ships none there) — see keys/aglais-deployment.json.
const NETWORK = process.env.QUIP_NETWORK ?? "base-sepolia";
const aglais = defineChain({
  id: 20033, name: "Aglais (Quip testnet)",
  nativeCurrency: { name: "AGLS", symbol: "AGLS", decimals: 18 },
  rpcUrls: { default: { http: ["https://evm-rpc.aglais.quip.network:20049"] } },
});
const NETWORKS = {
  "base-sepolia": { chain: baseSepolia, rpc: "https://sepolia.base.org", explorer: "https://sepolia.basescan.org" },
  aglais: { chain: aglais, rpc: aglais.rpcUrls.default.http[0], explorer: "https://explorer.aglais.quip.network" },
};
if (!NETWORKS[NETWORK]) throw new Error(`unknown QUIP_NETWORK ${NETWORK}`);
const { chain } = NETWORKS[NETWORK];
const RPC = process.env.QUIP_RPC ?? NETWORKS[NETWORK].rpc;
const EXPLORER = process.env.QUIP_EXPLORER ?? NETWORKS[NETWORK].explorer;
// Contract overrides for chains the SDK has no registry entry for.
const OVERRIDES = NETWORK === "aglais" && existsSync("keys/aglais-deployment.json")
  ? (({ WalletFactory, ShrincsWalletImpl }) => ({ factoryAddress: WalletFactory, walletImplementation: ShrincsWalletImpl }))(
      JSON.parse(readFileSync("keys/aglais-deployment.json", "utf8")))
  : {};

// Signing-key parameters. Must be identical between create and every later
// command, since they are baked into the wallet's commitment/address.
const MAX_SIGNATURES = Number(process.env.QUIP_MAX_SIGNATURES ?? 64);
const MAIN_INDEX = 0;
const ERC1271_INDEX = 1;

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const log = (...a) => console.log(...a);
const txLink = (h) => `${EXPLORER}/tx/${h}`;
const addrLink = (a) => `${EXPLORER}/address/${a}`;

function loadEoa() {
  if (!existsSync(EOA_FILE)) throw new Error("no EOA key — run `init` first");
  return privateKeyToAccount(readJson(EOA_FILE).privateKey);
}

async function loadSigner() {
  if (!existsSync(PQ_FILE)) throw new Error("no SHRINCS mnemonic — run `init` first");
  return ShrincsSigner.fromMnemonic(readJson(PQ_FILE).mnemonic);
}

// WORKAROUND: the Quip SDK passes `account: <address string>` into viem's
// writeContract, which makes viem send `eth_sendTransaction` (node-side
// signing, i.e. an injected browser wallet). Public RPCs have no signer, so we
// wrap the transport: eth_sendTransaction is signed locally with the throwaway
// key and broadcast as eth_sendRawTransaction; everything else passes through.
function localSigningTransport(account) {
  const rpc = http(RPC)({ chain });
  const signer = createWalletClient({ account, chain, transport: http(RPC) });
  const big = (h) => (h === undefined ? undefined : hexToBigInt(h));
  return custom({
    async request({ method, params }) {
      if (method === "eth_accounts" || method === "eth_requestAccounts") return [account.address];
      if (method !== "eth_sendTransaction") return rpc.request({ method, params });
      const tx = params[0];
      if (getAddress(tx.from) !== account.address) throw new Error(`refusing to sign for ${tx.from}`);
      return signer.sendTransaction({
        to: tx.to, data: tx.data, value: big(tx.value) ?? 0n, gas: big(tx.gas),
        maxFeePerGas: big(tx.maxFeePerGas), maxPriorityFeePerGas: big(tx.maxPriorityFeePerGas),
        ...(tx.nonce !== undefined && { nonce: hexToNumber(tx.nonce) }),
      });
    },
  });
}

function clients(account) {
  const publicClient = createPublicClient({ chain, transport: http(RPC) });
  const walletClient = createWalletClient({ account, chain, transport: localSigningTransport(account) });
  const factory = new ShrincsFactoryClient({
    publicClient, walletClient, account: account.address, chainId: chain.id, ...OVERRIDES,
  });
  return { publicClient, walletClient, factory };
}

const walletParams = (signer, owner) => ({
  signer, owner, maxSignatures: MAX_SIGNATURES,
  derivationIndex: MAIN_INDEX, erc1271: { derivationIndex: ERC1271_INDEX },
});

async function predictedAddress(factory, signer, owner) {
  const main = signer.recoverKeyPair(MAIN_INDEX, { maxSignatures: MAX_SIGNATURES });
  const erc = signer.recoverKeyPair(ERC1271_INDEX, { maxSignatures: MAX_SIGNATURES });
  const deployed = await factory.getShrincsWalletAddress(main.publicKeyCommitment, erc.publicKeyCommitment, owner);
  if (deployed !== "0x0000000000000000000000000000000000000000") return deployed;
  // Not deployed yet: CREATE3 prediction from the factory + V1 identity commitment.
  return getShrincsWalletAddress(factory.factoryAddress, main.publicKeyCommitment, erc.publicKeyCommitment, owner);
}

async function openWallet() {
  const eoa = loadEoa();
  const signer = await loadSigner();
  const c = clients(eoa);
  const wallet = await c.factory.getShrincsWallet(walletParams(signer, eoa.address));
  return { eoa, signer, wallet, ...c };
}

function saveState(patch) {
  const s = existsSync(STATE_FILE) ? readJson(STATE_FILE) : {};
  writeFileSync(STATE_FILE, JSON.stringify({ ...s, ...patch }, null, 2));
}

const commands = {
  async init() {
    mkdirSync(KEYS, { recursive: true });
    if (!existsSync(EOA_FILE)) {
      const pk = generatePrivateKey();
      writeFileSync(EOA_FILE, JSON.stringify({
        privateKey: pk, address: privateKeyToAccount(pk).address,
        note: "THROWAWAY TESTNET KEY",
      }, null, 2), { mode: 0o600 });
    }
    if (!existsSync(PQ_FILE)) {
      writeFileSync(PQ_FILE, JSON.stringify({
        mnemonic: generateMnemonic(),
        note: "THROWAWAY SHRINCS master mnemonic (post-quantum key material)",
      }, null, 2), { mode: 0o600 });
    }
    log("EOA (gas payer / classical owner):", loadEoa().address);
    log("SHRINCS mnemonic stored in", PQ_FILE);
  },

  async info() {
    const eoa = loadEoa();
    const signer = await loadSigner();
    const { publicClient, factory } = clients(eoa);
    const t0 = Date.now();
    const addr = await predictedAddress(factory, signer, eoa.address);
    log(`chain            ${chain.name} (${chain.id}) via ${RPC}`);
    log(`WalletFactory    ${factory.factoryAddress}`);
    log(`EOA              ${eoa.address}  balance ${formatEther(await publicClient.getBalance({ address: eoa.address }))} ETH`);
    log(`smart account    ${addr}  (counterfactual; keygen ${Date.now() - t0} ms)`);
    log(`  deployed?      ${(await publicClient.getCode({ address: addr })) ? "yes" : "no"}`);
    log(`  balance        ${formatEther(await publicClient.getBalance({ address: addr }))} ETH`);
    log(`  explorer       ${addrLink(addr)}`);
  },

  async create() {
    const eoa = loadEoa();
    const signer = await loadSigner();
    const { factory } = clients(eoa);
    const params = walletParams(signer, eoa.address);
    const est = await factory.estimateCreationCost(params);
    log("creation estimate:", Object.fromEntries(Object.entries(est).map(([k, v]) => [k, String(v)])));
    const wallet = await factory.createShrincsWallet(params);
    log("smart account deployed:", wallet.walletAddress);
    log("  explorer:", addrLink(wallet.walletAddress));
    saveState({ walletAddress: wallet.walletAddress, commitment: wallet.commitment, chainId: chain.id });
  },

  async fund(amount) {
    if (!amount) throw new Error("usage: fund <eth>");
    const { eoa, wallet, publicClient, walletClient } = await openWallet();
    const hash = await walletClient.sendTransaction({ to: wallet.walletAddress, value: parseEther(amount) });
    const r = await publicClient.waitForTransactionReceipt({ hash });
    log(`funded ${wallet.walletAddress} with ${amount} ETH from ${eoa.address}: ${r.status}`);
    log("  tx:", hash, "\n  explorer:", txLink(hash));
    saveState({ fundTx: hash });
  },

  async transfer(to, amount, flag) {
    if (!to || !isAddress(to) || !amount) throw new Error("usage: transfer <to> <eth> [--from-eoa]");
    const { wallet, publicClient } = await openWallet();
    const before = await wallet.getWalletState();
    const params = { target: getAddress(to), value: parseEther(amount) };
    let receipt;
    if (flag === "--from-eoa") {
      // SDK default path: prepareExecute signs exactly once (one SHRINCS
      // stateful leaf) and attaches msg.value = value + maxFee, i.e. the EOA
      // pays the transferred amount, NOT the smart account's own balance.
      const prepared = await wallet.prepareExecute(params);
      log(`SHRINCS stateful leaf ${prepared.leaf}/${before.maxSignatures} signed; msg.value=${formatEther(prepared.totalValue)} ETH (paid by EOA)`);
      receipt = await prepared.send();
    } else {
      // WORKAROUND (default): spend the smart account's OWN balance. The SDK has
      // no public option for this, so reuse its internal builder (same SHRINCS
      // signature over target/value/data/maxFee) and send msg.value = maxFee only.
      const { contractCall, maxFee, leaf } = await wallet.buildExecuteCall(params, {});
      contractCall.value = maxFee;
      log(`SHRINCS stateful leaf ${leaf}/${before.maxSignatures} signed; msg.value=${formatEther(maxFee)} ETH (value paid from smart account balance)`);
      receipt = await wallet.send(contractCall, maxFee, {});
    }
    log(`transfer ${amount} ETH -> ${to}: ${receipt.status} (block ${receipt.blockNumber}, gasUsed ${receipt.gasUsed})`);
    log("  tx:", receipt.transactionHash, "\n  explorer:", txLink(receipt.transactionHash));
    log("  recipient balance:", formatEther(await publicClient.getBalance({ address: getAddress(to) })), "ETH");
    log("  smart account balance:", formatEther(await publicClient.getBalance({ address: wallet.walletAddress })), "ETH");
    saveState({ lastTransferTx: receipt.transactionHash });
  },

  async status() {
    const { wallet, publicClient } = await openWallet();
    const s = await wallet.getWalletState();
    log("smart account", wallet.walletAddress, "\n  explorer:", addrLink(wallet.walletAddress));
    log("  balance:", formatEther(await publicClient.getBalance({ address: wallet.walletAddress })), "ETH");
    for (const [k, v] of Object.entries(s)) log(`  ${k}: ${v}`);
  },

  async "aglais-faucet"() {
    // Quip's own testnet faucet. NOTE: Aglais (chain 20033) has none of the
    // smart-account contracts, so these funds cannot be used by the SDK.
    const eoa = loadEoa();
    const res = await fetch("https://faucet.aglais.quip.network/request", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ dest: eoa.address }),
    });
    log(res.status, await res.text());
  },
};

const [cmd, ...args] = process.argv.slice(2);
if (!commands[cmd]) {
  log("usage: node quip-wallet.mjs <" + Object.keys(commands).join("|") + "> [args]");
  process.exit(1);
}
commands[cmd](...args).catch((e) => {
  console.error("ERROR:", e.shortMessage ?? e.message);
  if (process.env.DEBUG) console.error(e);
  process.exit(1);
});
