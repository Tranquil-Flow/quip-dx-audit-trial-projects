// PoW miner for the Ellipsis Labs devnet faucet (program PoWSNH2hEZogtCg1Zgm51FnkmJperzYDgPK4fvs8taL)
// Ported from jarry-xiao/proof-of-work-faucet (devnet-pow v0.1.4), whose bundled
// solana-client 1.18 cannot parse modern devnet RPC responses ("invalid type: map").
// Mine: find ed25519 pubkeys whose base58 starts with >= difficulty 'A's; the faucet
// program then pays `amount` lamports from its source PDA to our payer.
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createHash, randomBytes } from "node:crypto";
import { ed25519 } from "@noble/curves/ed25519.js";

const RPC_URL = process.env.QUIP_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM = new PublicKey("PoWSNH2hEZogtCg1Zgm51FnkmJperzYDgPK4fvs8taL");
const AIRDROP_DISCRIMINATOR = createHash("sha256").update("global:airdrop").digest().subarray(0, 8);

const conn = new Connection(RPC_URL, "confirmed");

function loadPayer() {
  const fs = require("node:fs");
  const path = require("node:path");
  const file = path.resolve(process.env.QUIP_KEYS_DIR || "./keys", "payer.json");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8")).secretKey));
}

async function listFaucets() {
  const accounts = await conn.getProgramAccounts(PROGRAM, {
    filters: [{ dataSize: 17 }],
    encoding: "base64",
  });
  const faucets = [];
  for (const { pubkey, account } of accounts) {
    const raw = Buffer.isBuffer(account.data) ? account.data : Buffer.from(account.data[0], "base64");
    const data = Buffer.from(raw);
    const difficulty = data[8];
    const amount = data.readBigUInt64LE(9);
    const [source] = PublicKey.findProgramAddressSync([Buffer.from("source"), pubkey.toBuffer()], PROGRAM);
    faucets.push({ spec: pubkey, difficulty, amount, source });
  }
  return faucets;
}

function pubkeyPrefixA(kp) {
  const s = bs58.encode(kp.publicKey.toBytes());
  let n = 0;
  while (n < s.length && s[n] === "A") n++;
  return n;
}

async function main() {
  const target = BigInt(process.argv[2] || "1500000000");
  const payer = loadPayer();
  console.log("payer:", payer.publicKey.toBase58());
  const faucets = await listFaucets();
  console.log("faucet specs on chain:", faucets.length);

  // annotate balances
  const balances = await Promise.all(faucets.map(f => conn.getBalance(f.source)));
  faucets.forEach((f, i) => (f.balance = BigInt(balances[i])));
  const usable = faucets.filter(f => f.balance >= f.amount);
  usable.sort((a, b) => a.difficulty - b.difficulty || Number(b.amount - a.amount));
  for (const f of usable.slice(0, 12)) {
    console.log(`  diff=${f.difficulty} reward=${Number(f.amount) / 1e9} SOL bal=${Number(f.balance) / 1e9} SOL spec=${f.spec.toBase58()}`);
  }

  let claimed = 0n;
  const perDifficultyClaimed = new Map(); // signer -> Set(difficulty)
  let attempts = 0;
  const t0 = Date.now();
  const maxDifficulty = Math.max(...usable.map(f => f.difficulty), 1);

  while (claimed < target && usable.length > 0) {
    // generate candidate keys with noble ed25519 directly (faster than Keypair.generate)
    const seed = randomBytes(32);
    const pub = ed25519.getPublicKey(seed);
    const s = bs58.encode(pub);
    let prefix = 0;
    while (prefix < s.length && s[prefix] === "A") prefix++;
    attempts++;

    if (prefix === 0) continue; // common case, skip quickly

    const candidates = usable
      .filter(f => f.difficulty <= prefix)
      .sort((a, b) => Number(b.amount - a.amount));

    if (candidates.length === 0) continue;

    const kp = Keypair.fromSecretKey(new Uint8Array([...seed, ...pub]));
    let claimedSet = perDifficultyClaimed.get(kp.publicKey.toBase58());
    if (!claimedSet) { claimedSet = new Set(); perDifficultyClaimed.set(kp.publicKey.toBase58(), claimedSet); }

    console.log(`mined key with ${prefix} leading A's after ${attempts} attempts (${((Date.now() - t0) / 1000).toFixed(1)}s): ${kp.publicKey.toBase58()}`);

    for (const f of candidates) {
      if (claimedSet.has(f.difficulty)) continue;
      const bal = await conn.getBalance(f.source);
      if (BigInt(bal) < f.amount) { f.balance = BigInt(bal); continue; }
      const [receipt] = PublicKey.findProgramAddressSync(
        [Buffer.from("receipt"), kp.publicKey.toBuffer(), Buffer.from([f.difficulty])], PROGRAM);
      const ix = {
        programId: PROGRAM,
        keys: [
          { pubkey: payer.publicKey, isSigner: true, isWritable: true },
          { pubkey: kp.publicKey, isSigner: true, isWritable: false },
          { pubkey: receipt, isSigner: false, isWritable: true },
          { pubkey: f.spec, isSigner: false, isWritable: false },
          { pubkey: f.source, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(AIRDROP_DISCRIMINATOR),
      };
      const tx = new Transaction().add(ix);
      try {
        const sig = await sendAndConfirmTransaction(conn, tx, [payer, kp], { commitment: "confirmed" });
        claimed += f.amount;
        claimedSet.add(f.difficulty);
        console.log(`CLAIMED ${Number(f.amount) / 1e9} SOL from faucet ${f.source.toBase58()} tx=${sig}`);
        console.log(`  total claimed: ${Number(claimed) / 1e9} SOL (target ${Number(target) / 1e9})`);
        if (claimed >= target) break;
      } catch (e) {
        console.log(`claim failed (diff=${f.difficulty}): ${e.message}`);
        f.balance = await conn.getBalance(f.source);
      }
    }
  }
  console.log(`done. claimed ${Number(claimed) / 1e9} SOL total in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${attempts} keygen attempts`);
  const finalBal = await conn.getBalance(payer.publicKey);
  console.log(`payer balance: ${finalBal / 1e9} SOL`);
}

main().catch(e => { console.error(e); process.exit(1); });
