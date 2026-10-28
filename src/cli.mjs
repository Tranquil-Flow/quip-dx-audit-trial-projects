#!/usr/bin/env node
// Quip PQ wallet CLI (Solana devnet, WOTS+ via @quip.network/solana-sdk)
import fs from "fs";
import crypto from "crypto";
import * as quip from "@quip.network/solana-sdk";
const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, QuipClient, QuipSigner } = quip;

const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const KEYS = new URL("../keys/", import.meta.url).pathname;
const PAYER_F = KEYS + "payer.json", SECRET_F = KEYS + "pq-secret.hex", VAULT_F = KEYS + "vault-id.hex";
const conn = new Connection(RPC, "confirmed");

// Keypair-backed adapter (the SDK expects a wallet-adapter interface)
const adapterFor = (kp) => ({
  publicKey: kp.publicKey,
  signTransaction: async (tx) => { tx.partialSign(kp); return tx; },
  signAllTransactions: async (txs) => { txs.forEach((t) => t.partialSign(kp)); return txs; },
});
const loadPayer = () => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(PAYER_F))));
const ctx = () => {
  const payer = loadPayer();
  const signer = new QuipSigner(Buffer.from(fs.readFileSync(SECRET_F, "utf8").trim(), "hex"));
  const vault = fs.readFileSync(VAULT_F, "utf8").trim();
  return { payer, signer, vault, client: new QuipClient(conn, adapterFor(payer)) };
};

const cmds = {
  async init() {
    fs.mkdirSync(KEYS, { recursive: true });
    if (fs.existsSync(PAYER_F)) throw new Error("keys already exist in ./keys; refusing to overwrite");
    const kp = Keypair.generate();
    fs.writeFileSync(PAYER_F, JSON.stringify([...kp.secretKey]), { mode: 0o600 });
    fs.writeFileSync(SECRET_F, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
    fs.writeFileSync(VAULT_F, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
    console.log("payer (classical fee payer/owner):", kp.publicKey.toBase58());
  },
  async fund([sol = "1"]) {
    const { payer } = ctx();
    const sig = await conn.requestAirdrop(payer.publicKey, Math.round(Number(sol) * LAMPORTS_PER_SOL));
    await conn.confirmTransaction(sig, "confirmed");
    console.log("airdrop tx:", sig, "balance:", (await conn.getBalance(payer.publicKey)) / LAMPORTS_PER_SOL);
  },
  async factory() {
    const { client } = ctx();
    console.log(await client.getFactoryState());
  },
  async create([sol = "0.1"]) {
    const { client, signer, vault } = ctx();
    const w = await client.createWallet(vault, signer, BigInt(Math.round(Number(sol) * LAMPORTS_PER_SOL)));
    console.log("Quip wallet PDA:", await w.getAddress(), "balance:", await w.getBalance());
  },
  async info() {
    const { client, signer, vault, payer } = ctx();
    const w = await client.getWallet(vault, signer);
    const s = await w.getWalletState();
    console.log({ payer: payer.publicKey.toBase58(), wallet: await w.getAddress(), lamports: await w.getBalance(),
      txCount: s.transactionCount, wotsPubSeed: Buffer.from(s.currentWotsKey.publicSeed).toString("hex"),
      wotsPubKeyHash: Buffer.from(s.currentWotsKey.publicKeyHash).toString("hex") });
  },
  async send([to, sol]) {
    if (!to || !sol) throw new Error("usage: send <recipient> <sol>");
    const { client, signer, vault } = ctx();
    const w = await client.getWallet(vault, signer);
    const sig = await w.transferWithWotsChunked(new PublicKey(to), BigInt(Math.round(Number(sol) * LAMPORTS_PER_SOL)));
    console.log("transfer tx:", sig, "\nexplorer: https://explorer.solana.com/tx/" + sig + "?cluster=devnet");
    console.log("new balance:", await w.getBalance());
  },
  async newkey() {
    const kp = Keypair.generate();
    console.log(kp.publicKey.toBase58());
  },
};
const [c, ...rest] = process.argv.slice(2);
if (!cmds[c]) { console.log("usage: quip-wallet <init|fund [sol]|factory|create [sol]|info|send <to> <sol>|newkey>"); process.exit(1); }
cmds[c](rest).catch((e) => { console.error("ERROR:", e.message, e.logs || ""); process.exit(1); });
