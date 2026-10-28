#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import sdk from '../dist/quip-sdk.cjs';

const { QuipClient, QuipSigner, QUIP_PROGRAM_ID, getFactoryAddress } = sdk;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_DIR = path.join(ROOT, 'keys');
const RPC = 'https://api.devnet.solana.com';
const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const FILES = ['payer.json', 'pq-secret.json', 'recipient.json', 'config.json'];
const usage = `Usage: npm start -- <command> [arguments]
  init                     Generate fresh payer, PQ secret, vault ID, recipient in ./keys
  airdrop <SOL>            Request devnet faucet SOL for throwaway fee payer (max 1)
  create <SOL>             Create Quip WOTS+ wallet with initial SOL deposit (e.g. 0.05)
  fund <SOL>               Send extra devnet SOL from throwaway payer to Quip PDA
  send <SOL> [recipient]   Quip PQ-signed transfer to generated recipient (or address)
  status                   Display factory fees, addresses, balances and PQ key state
All commands use Solana devnet only. NEVER use production keys or funds.`;

export function lamports(value) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d{1,9})?$/.test(value)) {
    throw new Error('Amount must be a nonnegative decimal SOL string with at most 9 decimal places');
  }
  const [whole, fractional = ''] = value.split('.');
  const amount = BigInt(whole) * 1_000_000_000n + BigInt(fractional.padEnd(9, '0'));
  if (amount < 1n || amount > 0xffffffffffffffffn) throw new Error('Amount must be positive and fit in u64');
  return amount;
}

function sol(amount) {
  const n = BigInt(amount);
  return `${n / 1_000_000_000n}.${(n % 1_000_000_000n).toString().padStart(9, '0')}`;
}

async function safeRead(name) {
  const filename = path.join(KEY_DIR, name);
  const stat = await fs.lstat(filename);
  if (!stat.isFile() || (stat.mode & 0o077)) throw new Error(`${name} must be a private regular file (chmod 600)`);
  return JSON.parse(await fs.readFile(filename, 'utf8'));
}

async function loadKeys() {
  const [payerBytes, secret, recipientBytes, config] = await Promise.all(FILES.map(safeRead));
  if (!Array.isArray(payerBytes) || payerBytes.length !== 64 || !Array.isArray(recipientBytes) || recipientBytes.length !== 64 || !Array.isArray(secret) || secret.length !== 32) {
    throw new Error('Malformed keys; expected a 64-byte keypair and 32-byte PQ secret');
  }
  if (!/^[0-9a-f]{64}$/.test(config.vaultId)) throw new Error('Malformed vault ID');
  const payer = Keypair.fromSecretKey(Uint8Array.from(payerBytes));
  const recipient = Keypair.fromSecretKey(Uint8Array.from(recipientBytes));
  if (payer.publicKey.toBase58() !== config.payer || recipient.publicKey.toBase58() !== config.recipient) throw new Error('Public key mismatch in keys/config.json');
  return { payer, recipient, secret: Uint8Array.from(secret), vaultId: Buffer.from(config.vaultId, 'hex') };
}

async function init() {
  await fs.mkdir(KEY_DIR, { mode: 0o700 }); // Refuse existing directory; never touch pre-existing keys.
  await fs.chmod(KEY_DIR, 0o700);
  const payer = Keypair.generate();
  const recipient = Keypair.generate();
  const vaultId = randomBytes(32);
  const quantumSecret = randomBytes(32);
  const values = [Array.from(payer.secretKey), Array.from(quantumSecret), Array.from(recipient.secretKey), {
    vaultId: vaultId.toString('hex'), payer: payer.publicKey.toBase58(), recipient: recipient.publicKey.toBase58(),
  }];
  for (const [index, name] of FILES.entries()) {
    await fs.writeFile(path.join(KEY_DIR, name), JSON.stringify(values[index]) + '\n', { mode: 0o600, flag: 'wx' });
  }
  console.log(`Payer: ${payer.publicKey.toBase58()}\nRecipient: ${recipient.publicKey.toBase58()}\nKeys stored in ./keys (private; do not commit).`);
}

async function verifiedConnection() {
  const connection = new Connection(RPC, 'confirmed');
  const genesis = await connection.getGenesisHash();
  if (genesis !== DEVNET_GENESIS) throw new Error(`Refusing network with unexpected genesis hash ${genesis}`);
  return connection;
}

function makeClient(connection, keys) {
  // The vendor SDK accepts a WalletAdapter; this minimal adapter signs only with a NEW local devnet key.
  const adapter = {
    publicKey: keys.payer.publicKey,
    async signTransaction(tx) { tx.partialSign(keys.payer); return tx; },
    async signAllTransactions(txs) { for (const tx of txs) tx.partialSign(keys.payer); return txs; },
  };
  const signer = new QuipSigner(keys.secret);
  return new QuipClient(connection, adapter);
}

async function assertSuccess(connection, signature) {
  const tx = await connection.getTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
  if (!tx) throw new Error(`Transaction ${signature} not yet available at confirmed commitment; check explorer`);
  if (!tx.meta) throw new Error(`Transaction ${signature} has no execution metadata; cannot verify success`);
  if (tx.meta.err) throw new Error(`On-chain transaction ${signature} failed: ${JSON.stringify(tx.meta.err)}`);
  return tx;
}

async function walletInfo(connection, keys) {
  const client = makeClient(connection, keys);
  const address = await client.getWalletAddress(keys.vaultId);
  return { client, address, walletKey: new PublicKey(address) };
}

async function airdrop(connection, keys, raw) {
  const amount = lamports(raw);
  if (amount > 1_000_000_000n) throw new Error('Faucet request capped at 1 devnet SOL');
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const signature = await connection.requestAirdrop(keys.payer.publicKey, Number(amount));
  console.log(`Airdrop requested: ${signature}`);
  const result = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  if (result.value.err) throw new Error(`Airdrop failed: ${JSON.stringify(result.value.err)}`);
  await assertSuccess(connection, signature);
  console.log(`Airdrop confirmed: ${signature}; payer balance ${sol(await connection.getBalance(keys.payer.publicKey))} SOL`);
}

async function create(connection, keys, raw) {
  const amount = lamports(raw);
  const { client, address, walletKey } = await walletInfo(connection, keys);
  const factory = await client.getFactoryState();
  if (await connection.getAccountInfo(walletKey)) throw new Error(`Wallet already exists: ${address}`);
  const balance = BigInt(await connection.getBalance(keys.payer.publicKey));
  if (balance < amount + factory.creationFee + 25_000_000n) throw new Error('Payer balance too low for deposit + creation fee + transaction/rent reserve');
  console.log(`Creating Quip wallet ${address} with ${sol(amount)} SOL deposit (WOTS+); factory fee ${sol(factory.creationFee)} SOL`);
  const wallet = await client.createWallet(keys.vaultId, new QuipSigner(keys.secret), amount);
  const signatures = await connection.getSignaturesForAddress(walletKey, { limit: 5 }, 'confirmed');
  const signature = signatures.find((entry) => entry.err === null)?.signature;
  if (!signature) throw new Error(`Wallet created but creation signature lookup failed; check ${address}`);
  await assertSuccess(connection, signature);
  console.log(`Created: ${address}\nCreation transaction: ${signature}\nBalance: ${sol(await connection.getBalance(walletKey))} SOL\nPQ key hash: ${Buffer.from((await wallet.getPqOwner()).publicKeyHash).toString('hex')}`);
}

async function fund(connection, keys, raw) {
  const amount = lamports(raw);
  const { client, walletKey, address } = await walletInfo(connection, keys);
  await client.getWallet(keys.vaultId, new QuipSigner(keys.secret));
  const signature = await sendAndConfirmTransaction(connection, new Transaction().add(SystemProgram.transfer({
    fromPubkey: keys.payer.publicKey, toPubkey: walletKey, lamports: amount,
  })), [keys.payer], { commitment: 'confirmed' });
  await assertSuccess(connection, signature);
  console.log(`Funded Quip wallet ${address}: ${sol(amount)} SOL\nFunding transaction: ${signature}\nBalance: ${sol(await connection.getBalance(walletKey))} SOL`);
}

async function recordAttempt(seed) {
  const filename = path.join(KEY_DIR, 'wots-attempts.json');
  let prior = [];
  try { prior = await safeRead('wots-attempts.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!Array.isArray(prior) || prior.some((s) => typeof s !== 'string')) throw new Error('Malformed WOTS attempt journal');
  if (prior.includes(seed)) throw new Error('WOTS key already used in a prior send attempt; refusing to sign again with one-time key. Inspect devnet state before recovery.');
  // Persist BEFORE signing; a failed/partial multi-tx submission may have exposed the signature.
  const tmp = path.join(KEY_DIR, `wots-attempts-${process.pid}-${randomBytes(6).toString('hex')}.tmp`);
  await fs.writeFile(tmp, JSON.stringify([...prior, seed]) + '\n', { mode: 0o600, flag: 'wx' });
  await fs.rename(tmp, filename);
}

async function send(connection, keys, raw, destination) {
  const amount = lamports(raw);
  const to = destination ? new PublicKey(destination) : keys.recipient.publicKey;
  const { client, walletKey } = await walletInfo(connection, keys);
  if (to.equals(walletKey)) throw new Error('Refusing to transfer to self');
  const wallet = await client.getWallet(keys.vaultId, new QuipSigner(keys.secret));
  const state = await wallet.getWalletState();
  const fee = await wallet.getTransferFee();
  const balance = BigInt(await connection.getBalance(walletKey));
  if (balance < amount + fee + 1_000_000n) throw new Error('Quip wallet balance too low for transfer + factory fee + rent reserve');
  if (await connection.getBalance(keys.payer.publicKey) < 25_000_000) throw new Error('Fee payer needs at least 0.025 SOL for signature-storage rent and network fees');
  const seed = Buffer.from(state.currentWotsKey.publicSeed).toString('hex');
  await recordAttempt(seed);
  console.log(`Submitting WOTS+ signed transfer of ${sol(amount)} SOL from ${walletKey.toBase58()} to ${to.toBase58()}; key attempt recorded in ./keys/wots-attempts.json`);
  const signature = await wallet.transferWithWinternitz(to.toBase58(), amount);
  await assertSuccess(connection, signature);
  const updated = await wallet.getWalletState();
  if (Buffer.from(updated.currentWotsKey.publicSeed).toString('hex') === seed || updated.transactionCount <= state.transactionCount) {
    throw new Error(`Transaction ${signature} confirmed but WOTS+ key not rotated / transaction count unchanged`);
  }
  console.log(`PQ transfer confirmed: ${signature}\nWOTS+ key rotated: ${seed} -> ${Buffer.from(updated.currentWotsKey.publicSeed).toString('hex')}\nRecipient balance: ${sol(await connection.getBalance(to))} SOL\nQuip wallet balance: ${sol(await connection.getBalance(walletKey))} SOL`);
}

async function lockedSend(connection, keys, raw, destination) {
  // Prevent two CLI processes from signing different messages with the same one-time WOTS key.
  const lock = path.join(KEY_DIR, 'send.lock');
  let handle;
  try {
    handle = await fs.open(lock, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Another send is active or crashed. Inspect on-chain state and WOTS journal before removing keys/send.lock.');
    throw error;
  }
  try {
    return await send(connection, keys, raw, destination);
  } finally {
    await handle.close();
    await fs.unlink(lock);
  }
}

async function status(connection, keys) {
  const { client, address, walletKey } = await walletInfo(connection, keys);
  const factory = await client.getFactoryState();
  const account = await connection.getAccountInfo(walletKey);
  console.log(`Network: devnet (${RPC})\nProgram: ${QUIP_PROGRAM_ID.toBase58()}\nFactory: ${getFactoryAddress()[0].toBase58()}\nCreation fee: ${sol(factory.creationFee)} SOL\nTransfer fee: ${sol(factory.transferFee)} SOL\nPayer: ${keys.payer.publicKey.toBase58()} (${sol(await connection.getBalance(keys.payer.publicKey))} SOL)\nQuip wallet: ${address} (${sol(await connection.getBalance(walletKey))} SOL)\nRecipient: ${keys.recipient.publicKey.toBase58()} (${sol(await connection.getBalance(keys.recipient.publicKey))} SOL)`);
  if (account) {
    const state = await (await client.getWallet(keys.vaultId, new QuipSigner(keys.secret))).getWalletState();
    console.log(`PQ scheme: WOTS+\nPQ key hash: ${Buffer.from(state.currentWotsKey.publicKeyHash).toString('hex')}\nPQ public seed: ${Buffer.from(state.currentWotsKey.publicSeed).toString('hex')}\nPQ transaction count: ${state.transactionCount}`);
  } else console.log('Quip wallet: not created yet');
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'help' || !command) return console.log(usage);
  if (command === 'init' && args.length === 0) return init();
  if (!['airdrop', 'create', 'fund', 'send', 'status'].includes(command) || (command === 'status' && args.length) || (command === 'send' && (args.length < 1 || args.length > 2)) || (command !== 'send' && command !== 'status' && args.length !== 1)) throw new Error(usage);
  const keys = await loadKeys();
  const connection = await verifiedConnection();
  switch (command) {
    case 'airdrop': return airdrop(connection, keys, args[0]);
    case 'create': return create(connection, keys, args[0]);
    case 'fund': return fund(connection, keys, args[0]);
    case 'send': return lockedSend(connection, keys, args[0], args[1]);
    case 'status': return status(connection, keys);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exitCode = 1; });
}
