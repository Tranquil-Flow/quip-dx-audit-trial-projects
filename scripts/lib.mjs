// Shared helpers for the QuipSwap OTC prototype (Base Sepolia).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createPublicClient, createWalletClient, http, defineChain, encodeFunctionData, keccak256, concat, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { ShrincsSigner, ShrincsFactoryClient, ShrincsWalletClient } from "@quip.network/ethereum-sdk/v1/shrincs";

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
export const KEYS = path.join(ROOT, "keys");
export const RPC = process.env.RPC_URL ?? "https://sepolia.base.org";
export const CHAIN_ID = 84532;
// From the deployments table embedded in swap.quip.network / account.quip.network bundles,
// confirmed on-chain: VERSION() == "QUIP:Omnibus:v1.0.0-beta.3".
export const OMNIBUS = "0xA7955981D5759a799267063110Be0F7AeCc26F8A";
export const WALLET_FACTORY = "0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8";
export const MAX_SIGNATURES = Number(process.env.MAX_SIGNATURES ?? 32);
export const ASSET = { Native: 0, ERC20: 1, ERC721: 2, ERC1155: 3 }; // enum AssetType, from bundle
export const OMNIBUS_ABI = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "QuipSwap.abi.json"), "utf8"));

export const chain = RPC.includes("127.0.0.1") || RPC.includes("localhost")
  ? defineChain({ ...baseSepolia, rpcUrls: { default: { http: [RPC] } } })
  : baseSepolia;
export const publicClient = createPublicClient({ chain, transport: http(RPC) });

export function loadEoa(name) {
  const k = JSON.parse(fs.readFileSync(path.join(KEYS, `${name}.json`), "utf8"))[0];
  return privateKeyToAccount(k.private_key);
}

// WORKAROUND: the SDK calls walletClient.writeContract/sendTransaction with `account: <address string>`,
// which makes viem use eth_sendTransaction (node-side signing) -> "No Signer available" on public RPCs.
// Force every write to be signed locally with the EOA key.
export function localSigningWalletClient(account) {
  const wc = createWalletClient({ account, chain, transport: http(RPC) });
  const fix = (fn) => (args) => fn({ ...args, account });
  return new Proxy(wc, { get(t, k) {
    if (k === "writeContract" || k === "sendTransaction") return fix(t[k].bind(t));
    return t[k];
  } });
}

// Separate seeds per environment: SHRINCS slots are one-time, never reuse fork-signed slots on testnet.
function seedFile(name) { return path.join(KEYS, `${name}${process.env.WALLET_TAG ?? ""}.shrincs-seed.hex`); }
function walletFile(name) { return path.join(KEYS, `${name}.wallet${process.env.WALLET_TAG ?? ""}.json`); }

export async function loadSigner(name) {
  const f = seedFile(name);
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
  const seed = Uint8Array.from(Buffer.from(fs.readFileSync(f, "utf8").trim(), "hex"));
  return ShrincsSigner.create(seed);
}

/** Create (once) or open the Quip (SHRINCS) wallet owned by EOA `name`. */
export async function getQuipWallet(name) {
  const account = loadEoa(name);
  const walletClient = localSigningWalletClient(account);
  const signer = await loadSigner(name);
  const factory = new ShrincsFactoryClient({ publicClient, walletClient, account: account.address, chainId: CHAIN_ID, factoryAddress: WALLET_FACTORY });
  const wf = walletFile(name);
  const params = { signer, maxSignatures: MAX_SIGNATURES, derivationIndex: 0, erc1271: { derivationIndex: 1 } };
  let wallet;
  if (fs.existsSync(wf)) {
    wallet = await factory.getShrincsWallet({ ...params, owner: account.address });
  } else {
    wallet = await factory.createShrincsWallet(params);
    fs.writeFileSync(wf, JSON.stringify({ walletAddress: wallet.walletAddress, owner: account.address, commitment: wallet.commitment }, null, 2));
  }
  return { name, account, walletClient, signer, factory, wallet };
}

export function newSecret() {
  const secret = `0x${crypto.randomBytes(32).toString("hex")}`;
  return { secret, lock: keccak256(secret) }; // bundle: lock = keccak256(secret) (fn ub)
}

export const now = async () => (await publicClient.getBlock()).timestamp;

export function commitCall(lock, party, counterparty, walletAddress, vaultId) {
  // bundle fn tAe/eAe: auth = { signer: concat([vaultAddress, vaultId]), signature: "0x" }
  const value = party.assets.filter(a => a.assetType === ASSET.Native).reduce((s, a) => s + a.amount, 0n);
  return {
    target: OMNIBUS, value,
    data: encodeFunctionData({ abi: OMNIBUS_ABI, functionName: "commit", args: [lock, party, counterparty, { signer: concat([walletAddress, vaultId]), signature: "0x" }] }),
  };
}
export const claimData = (secret, party, counterparty) => encodeFunctionData({ abi: OMNIBUS_ABI, functionName: "claim", args: [secret, party, counterparty] });
export const reclaimData = (lock, party, counterparty) => encodeFunctionData({ abi: OMNIBUS_ABI, functionName: "reclaim", args: [lock, party, counterparty] });

export const read = (functionName, args = []) => publicClient.readContract({ address: OMNIBUS, abi: OMNIBUS_ABI, functionName, args });
export const LOCK_STATE = ["Unused", "Free", "Committed", "Spent"]; // enum LockState, from bundle

export function decodeOmnibusEvents(receipt) {
  return parseEventLogs({ abi: OMNIBUS_ABI, logs: receipt.logs.filter(l => l.address.toLowerCase() === OMNIBUS.toLowerCase()) })
    .map(e => ({ event: e.eventName, args: e.args }));
}

export const j = (o) => JSON.stringify(o, (_, v) => typeof v === "bigint" ? v.toString() : v, 2);
export function record(file, obj) {
  const p = path.join(ROOT, "evidence");
  fs.mkdirSync(p, { recursive: true });
  fs.writeFileSync(path.join(p, file), j(obj));
}

export const IS_FORK = RPC.includes("127.0.0.1") || RPC.includes("localhost");
export const STEP = BigInt(process.env.STEP_SECONDS ?? 60);

/** Block until chain time >= ts. On a local fork, time-travel instead of sleeping. */
export async function waitUntil(ts, label) {
  let t = await now();
  if (t >= ts) return;
  console.log(`  … waiting for chain time ${ts} (${label}); now ${t}, ${ts - t}s to go`);
  if (IS_FORK) {
    await publicClient.request({ method: "evm_setNextBlockTimestamp", params: [`0x${ts.toString(16)}`] });
    await publicClient.request({ method: "evm_mine", params: [] });
    return;
  }
  while ((t = await now()) < ts) await new Promise(r => setTimeout(r, 4000));
}

/**
 * Deadlines for a same-chain swap. Contract requires strict interleaving:
 * proposer.commit < taker.commit < proposer.claim < taker.claim < proposer.reclaim < taker.reclaim
 * Windows (from the app's client-side validator): proposer commits in [0, P.commit),
 * taker commits in [P.commit, T.commit), claims in [T.commit, P.claim), reclaim in [reclaimRelease, inf).
 */
export function schedule(t0) {
  return {
    proposer: { commitmentDeadline: t0 + STEP, claimDeadline: t0 + 3n * STEP, reclaimRelease: t0 + 5n * STEP },
    taker: { commitmentDeadline: t0 + 2n * STEP, claimDeadline: t0 + 4n * STEP, reclaimRelease: t0 + 6n * STEP },
  };
}

export async function exec(qw, call, label) {
  const receipt = await qw.wallet.execute({ target: call.target, value: call.value ?? 0n, data: call.data });
  console.log(`  ✓ ${label}: tx ${receipt.transactionHash} (block ${receipt.blockNumber}, status ${receipt.status}, gas ${receipt.gasUsed})`);
  return receipt;
}

export async function tokenBalance(token, who) {
  if (!token) return null;
  return publicClient.readContract({ address: token, abi: [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] }], functionName: "balanceOf", args: [who] });
}
