#!/usr/bin/env node
// Quip PQ Wallet CLI — post-quantum smart account on Solana devnet
// Uses @quip.network/solana-sdk (WOTS+ signing) + @quip.network/hashsigs
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction, ComputeBudgetProgram } from "@solana/web3.js";
import { QuipClient, QuipSigner, getWalletAddress, createTransferWithWinternitzInstruction, getFactoryAddress, getSignatureStorageAddress, createStoreSignatureInstruction, sendAndConfirmTransactions } from "@quip.network/solana-sdk";
import { WOTSPlus } from "@quip.network/hashsigs";
import { keccak_256 } from "@noble/hashes/sha3";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

const RPC_URL = process.env.QUIP_RPC_URL || "https://api.devnet.solana.com";
const CLUSTER = process.env.QUIP_CLUSTER || "devnet";
const KEYS_DIR = path.resolve(process.env.QUIP_KEYS_DIR || "./keys");
const EXPLORER = "https://explorer.solana.com";
const EXPLORER_QS = CLUSTER === "custom" ? `cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}` : `cluster=${CLUSTER}`;

const conn = new Connection(RPC_URL, "confirmed");

function keyPath(name) { return path.join(KEYS_DIR, name); }
function saveKey(name, data) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
  fs.writeFileSync(keyPath(name), JSON.stringify(data, null, 2));
  fs.chmodSync(keyPath(name), 0o600);
}
function loadKey(name) {
  return JSON.parse(fs.readFileSync(keyPath(name), "utf8"));
}
function explorerTx(sig) { return `${EXPLORER}/tx/${sig}?${EXPLORER_QS}`; }
function explorerAddr(addr) { return `${EXPLORER}/address/${addr}?${EXPLORER_QS}`; }

// Keypair adapter that satisfies the SDK's wallet-adapter-style expectations
function keypairAdapter(kp) {
  return {
    publicKey: kp.publicKey,
    signTransaction: (tx) => { tx.sign(kp); return tx; },
    signAllTransactions: (txs) => { txs.forEach(tx => tx.sign(kp)); return txs; },
  };
}

function loadContext() {
  const payer = Keypair.fromSecretKey(Uint8Array.from(loadKey("payer.json").secretKey));
  const quantumSecret = Buffer.from(loadKey("quantum-secret.json").hex, "hex");
  const vaultId = Buffer.from(loadKey("vault.json").vaultIdHex, "hex");
  return { payer, quantumSecret, vaultId };
}

async function airdrop(payer, lamports) {
  console.log(`Requesting airdrop of ${lamports / LAMPORTS_PER_SOL} SOL to ${payer.publicKey.toBase58()} ...`);
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const sig = await conn.requestAirdrop(payer.publicKey, lamports);
      console.log(`  airdrop tx: ${sig}`);
      await conn.confirmTransaction(sig, "confirmed");
      console.log("  airdrop confirmed.");
      return;
    } catch (e) {
      lastErr = e;
      console.log(`  airdrop attempt ${attempt} failed: ${e.message}`);
      await new Promise(r => setTimeout(r, 4000 * attempt));
    }
  }
  throw lastErr;
}

async function ensureFunds(payer, minLamports) {
  const bal = await conn.getBalance(payer.publicKey);
  if (bal < minLamports) {
    await airdrop(payer, 2 * LAMPORTS_PER_SOL);
  }
  return conn.getBalance(payer.publicKey);
}

async function cmdGenerate() {
  if (fs.existsSync(keyPath("payer.json")) || fs.existsSync(keyPath("quantum-secret.json")) || fs.existsSync(keyPath("vault.json"))) {
    throw new Error("keys already exist in ./keys — refusing to overwrite (WOTS+ keys are one-time; reuse is unsafe). Delete them only if you know what you are doing.");
  }
  const payer = Keypair.generate();
  const quantumSecret = randomBytes(32);
  const vaultId = randomBytes(32);
  saveKey("payer.json", { secretKey: Array.from(payer.secretKey), publicKey: payer.publicKey.toBase58() });
  saveKey("quantum-secret.json", { hex: quantumSecret.toString("hex"), note: "32-byte master secret; QuipSigner keccak256s it and derives per-vault WOTS+ keys deterministically" });
  saveKey("vault.json", { vaultIdHex: vaultId.toString("hex"), note: "32-byte vault id" });
  console.log("Generated fresh devnet keys in ./keys:");
  console.log(`  payer (classical fee payer): ${payer.publicKey.toBase58()}`);
  console.log(`  vaultId: ${vaultId.toString("hex")}`);
  console.log(`  quantum secret: 32 random bytes (stored, not printed)`);
}

async function cmdCreate(initialDepositSol) {
  const { payer, quantumSecret, vaultId } = loadContext();
  const signer = new QuipSigner(quantumSecret);
  const quip = new QuipClient(conn, keypairAdapter(payer));
  await ensureFunds(payer, 2 * LAMPORTS_PER_SOL);
  const deposit = BigInt(Math.round(initialDepositSol * LAMPORTS_PER_SOL));
  console.log(`Creating PQ smart account (vault ${vaultId.toString("hex").slice(0, 16)}...) with initial deposit ${initialDepositSol} SOL`);
  const wallet = await quip.createWallet(vaultId, signer, deposit);
  const addr = await wallet.getAddress();
  const state = await wallet.getWalletState();
  console.log("CREATED:");
  console.log(`  wallet PDA: ${addr}`);
  console.log(`  explorer:   ${explorerAddr(addr)}`);
  const sigs = await conn.getSignaturesForAddress(new PublicKey(addr), { limit: 1 });
  if (sigs.length) console.log(`  create tx:  ${sigs[0].signature}  (${explorerTx(sigs[0].signature)})`);
  console.log(`  owner:      ${payer.publicKey.toBase58()}`);
  console.log(`  pq key seed: ${Buffer.from(state.currentWotsKey.publicSeed).toString("hex")}`);
  console.log(`  balance:    ${await wallet.getBalance()} SOL`);
  return addr;
}

async function cmdFund(target, sol) {
  const { payer } = loadContext();
  if (target === "payer") {
    await airdrop(payer, sol * LAMPORTS_PER_SOL);
  } else {
    // plain SOL top-up to the wallet PDA (withdrawals require WOTS+)
    const lamports = BigInt(Math.round(sol * LAMPORTS_PER_SOL));
    await ensureFunds(payer, 1 * LAMPORTS_PER_SOL);
    const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: new PublicKey(target), lamports }));
    const sig = await sendAndConfirmTransaction(conn, tx, [payer]);
    console.log(`Top-up tx: ${sig}`);
    console.log(`explorer:  ${explorerTx(sig)}`);
  }
  console.log(`payer balance: ${await conn.getBalance(payer.publicKey) / LAMPORTS_PER_SOL} SOL`);
  if (target !== "payer") console.log(`wallet balance: ${await conn.getBalance(new PublicKey(target)) / LAMPORTS_PER_SOL} SOL`);
}

async function cmdBalance() {
  const { payer, quantumSecret, vaultId } = loadContext();
  const [walletAddr] = getWalletAddress(payer.publicKey, vaultId);
  console.log(`payer:  ${payer.publicKey.toBase58()}  balance: ${await conn.getBalance(payer.publicKey) / LAMPORTS_PER_SOL} SOL`);
  console.log(`wallet: ${walletAddr.toBase58()}  balance: ${await conn.getBalance(walletAddr) / LAMPORTS_PER_SOL} SOL`);
  const info = await conn.getAccountInfo(walletAddr);
  if (info) {
    const { deserializeQuipWallet } = await import("@quip.network/solana-sdk");
    const st = deserializeQuipWallet(info.data);
    console.log(`  pq key seed: ${Buffer.from(st.currentWotsKey.publicSeed).toString("hex")}`);
    console.log(`  pq key hash: ${Buffer.from(st.currentWotsKey.publicKeyHash).toString("hex")}`);
    console.log(`  tx count: ${st.transactionCount.toString()}  created: ${new Date(Number(st.createdAt) * 1000).toISOString()}`);
    const signer = new QuipSigner(quantumSecret);
    const quip = new QuipClient(conn, keypairAdapter(payer));
    const wallet = await quip.getWallet(vaultId, signer); // validates PQ signer matches on-chain key
    console.log(`  PQ signer validated against on-chain key: OK (deterministic recovery from quantum secret)`);
  } else {
    console.log("  wallet account NOT found on chain yet — run `create` first.");
  }
}

async function cmdTransfer(toAddr, sol) {
  const { payer, quantumSecret, vaultId } = loadContext();
  const signer = new QuipSigner(quantumSecret);
  const quip = new QuipClient(conn, keypairAdapter(payer));
  const wallet = await quip.getWallet(vaultId, signer);
  const amount = BigInt(Math.round(sol * LAMPORTS_PER_SOL));
  const before = await wallet.getBalance();
  console.log(`Signing WOTS+ transfer of ${sol} SOL from PQ wallet to ${toAddr}`);
  console.log(`  (one-time WOTS+ key will rotate to a fresh key in the same tx)`);
  const sig = await wallet.transferWithWinternitz(toAddr, amount);
  console.log("SUBMITTED. Final transfer tx signature:");
  console.log(`  ${sig}`);
  console.log(`  explorer: ${explorerTx(sig)}`);
  const after = await wallet.getBalance();
  const state = await wallet.getWalletState();
  console.log(`wallet balance: ${before} -> ${after} SOL`);
  console.log(`new pq key seed: ${Buffer.from(state.currentWotsKey.publicSeed).toString("hex")}`);
  console.log(`tx count: ${state.transactionCount.toString()}`);
  return sig;
}

async function cmdShow() {
  const { payer, quantumSecret, vaultId } = loadContext();
  const [walletAddr] = getWalletAddress(payer.publicKey, vaultId);
  console.log("=== Quip PQ wallet on Solana devnet ===");
  console.log(`payer (classical signer): ${payer.publicKey.toBase58()}`);
  console.log(`  ${explorerAddr(payer.publicKey.toBase58())}`);
  console.log(`wallet PDA (PQ smart account): ${walletAddr.toBase58()}`);
  console.log(`  ${explorerAddr(walletAddr.toBase58())}`);
  console.log(`vaultId: ${vaultId.toString("hex")}`);
  console.log(`program: Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj`);
  console.log(`cluster: ${CLUSTER} (${RPC_URL})`);
  const bal = await conn.getBalance(walletAddr);
  console.log(`wallet balance: ${bal / LAMPORTS_PER_SOL} SOL`);
  const info = await conn.getAccountInfo(walletAddr);
  if (info) {
    const { deserializeQuipWallet } = await import("@quip.network/solana-sdk");
    const st = deserializeQuipWallet(info.data);
    console.log(`pq key seed: ${Buffer.from(st.currentWotsKey.publicSeed).toString("hex")}`);
    console.log(`pq key hash: ${Buffer.from(st.currentWotsKey.publicKeyHash).toString("hex")}`);
    console.log(`owner: ${st.owner.toBase58()}  tx count: ${st.transactionCount.toString()}`);
  }
}

async function main() {
  const cmd = process.argv[2];
  const args = process.argv.slice(3);
  if (cmd === "generate") await cmdGenerate();
  else if (cmd === "create") await cmdCreate(parseFloat(args[0] || "0.05"));
  else if (cmd === "fund") {
    if (args[0] === "payer") await cmdFund("payer", parseFloat(args[1] || "1"));
    else await cmdFund(args[0], parseFloat(args[1] || "0.05"));
  }
  else if (cmd === "balance") await cmdBalance();
  else if (cmd === "transfer") {
    const to = args[0];
    const sol = parseFloat(args[1] || "0.01");
    if (!to) throw new Error("usage: transfer <recipient-base58> [amount-sol]");
    await cmdTransfer(to, sol);
  }
  else if (cmd === "show") await cmdShow();
  else {
    console.log(`quip-wallet — post-quantum smart account CLI (Solana devnet)
usage:
  node dist/quipwallet.cjs generate                  create fresh throwaway keys in ./keys
  node dist/quipwallet.cjs create [deposit-sol]      create PQ smart account (deposit_to_winternitz)
  node dist/quipwallet.cjs fund payer [sol]          devnet faucet airdrop to fee payer
  node dist/quipwallet.cjs fund <wallet-addr> [sol]  top up wallet PDA
  node dist/quipwallet.cjs balance                   show balances + validate PQ signer
  node dist/quipwallet.cjs transfer <to> [sol]       WOTS+-signed transfer (one-time key, rotates)
  node dist/quipwallet.cjs show                      everything + explorer links
env: QUIP_RPC_URL (default https://api.devnet.solana.com), QUIP_KEYS_DIR (default ./keys)`);
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message || e);
  process.exit(1);
});
