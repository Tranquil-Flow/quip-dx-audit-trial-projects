// Negative test: try to sign a transfer with the OLD (pre-rotation) WOTS+ key.
// After rotation, the wallet's pq_owner is the NEW key; the program must reject.
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, ComputeBudgetProgram, Transaction, SystemProgram } from "@solana/web3.js";
import { QuipSigner, getWalletAddress, getFactoryAddress, getSignatureStorageAddress, createStoreSignatureInstruction, createTransferWithWinternitzInstruction, sendAndConfirmTransactions, QUIP_PROGRAM_ID } from "@quip.network/solana-sdk";
import { keccak_256 } from "@noble/hashes/sha3";
import fs from "node:fs";
import path from "node:path";

const RPC = process.env.QUIP_RPC_URL || "http://127.0.0.1:8899";
const KEYS_DIR = path.resolve(process.env.QUIP_KEYS_DIR || "./keys-local");
const conn = new Connection(RPC, "confirmed");

function load(name) { return JSON.parse(fs.readFileSync(path.join(KEYS_DIR, name), "utf8")); }

async function main() {
  const payer = Keypair.fromSecretKey(Uint8Array.from(load("payer.json").secretKey));
  const quantumSecret = Buffer.from(load("quantum-secret.json").hex, "hex");
  const vaultId = Buffer.from(load("vault.json").vaultIdHex, "hex");
  const signer = new QuipSigner(quantumSecret);

  const [walletAddr] = getWalletAddress(payer.publicKey, vaultId);
  const [factory] = getFactoryAddress();
  const info = await conn.getAccountInfo(walletAddr);
  const data = info.data;
  const currentSeed = data.subarray(72, 104);   // 8 discriminator + 32 factory + 32 owner
  const currentHash = data.subarray(104, 136);

  // The ORIGINAL key (before both rotations) was stored in keys-local/initial-pq.json? We didn't save it.
  // Instead: reconstruct the original key via its publicSeed — we captured it in output: ba426a9daa0f497acc26c416622a166dd700f6bd38e82aa7ee6085bd6d575410
  const oldPublicSeed = Buffer.from("ba426a9daa0f497acc26c416622a166dd700f6bd38e82aa7ee6085bd6d575410", "hex");
  console.log("current on-chain pq seed :", currentSeed.toString("hex"));
  console.log("old (rotated-away) seed :", oldPublicSeed.toString("hex"));
  if (oldPublicSeed.equals(currentSeed)) throw new Error("wallet still uses the old key — test invalid");

  const oldKey = signer.recoverKeyPair(vaultId, oldPublicSeed);
  const nextKey = signer.generateKeyPair(vaultId);
  const to = Keypair.generate().publicKey;
  const amount = 1000000n;
  const amountBuffer = Buffer.allocUnsafe(8);
  amountBuffer.writeBigUInt64LE(amount, 0);
  const messageData = Buffer.concat([
    Buffer.from(oldKey.publicKey.publicSeed), Buffer.from(oldKey.publicKey.publicKeyHash),
    Buffer.from(nextKey.publicKey.publicSeed), Buffer.from(nextKey.publicKey.publicKeyHash),
    to.toBuffer(), amountBuffer,
  ]);
  const messageHash = keccak_256(messageData);
  const sig = signer.sign(messageHash, vaultId, oldPublicSeed);
  const signatureData = new Uint8Array(sig.length * 32);
  for (let i = 0; i < sig.length; i++) signatureData.set(sig[i], i * 32);

  const [sigStore] = getSignatureStorageAddress(payer.publicKey);
  const adapter = { publicKey: payer.publicKey, signAllTransactions: (txs) => { txs.forEach(t => t.sign(payer)); return txs; } };

  // chunk store_signature txs (3 chunks of 980)
  const txs = [];
  for (let i = 0; i < signatureData.length; i += 980) {
    const chunk = signatureData.slice(i, i + 980);
    const ix = createStoreSignatureInstruction({ signatureStorage: sigStore, payer: payer.publicKey, systemProgram: SystemProgram.programId }, { chunkData: chunk, isFirstChunk: i === 0 });
    const tx = new Transaction().add(ix);
    tx.feePayer = payer.publicKey;
    txs.push(tx);
  }
  const finalTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
    createTransferWithWinternitzInstruction(
      { factory, wallet: walletAddr, recipient: to, payer: payer.publicKey, systemProgram: SystemProgram.programId, signatureStorage: sigStore },
      { vaultId, pqNext: nextKey.publicKey, amount })
  );
  finalTx.feePayer = payer.publicKey;
  txs.push(finalTx);

  try {
    const sigs = await sendAndConfirmTransactions(conn, txs, adapter);
    console.log("UNEXPECTED SUCCESS — program accepted an already-used key!", sigs[sigs.length - 1]);
    process.exit(1);
  } catch (e) {
    console.log("REJECTED as expected. Error:", e.message.split("\n").slice(0, 6).join(" | "));
    console.log("=> on-chain program enforces WOTS+ one-time keys / rotation.");
  }
  // confirm no state change
  const after = await conn.getAccountInfo(walletAddr);
  console.log("wallet pq seed unchanged:", after.data.subarray(72, 104).toString("hex") === currentSeed.toString("hex"));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
