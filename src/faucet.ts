import { readFile } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import { createPublicClient, createWalletClient, formatEther, http, parseEther, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// Optional, third-party FREE faucet, NOT a Quip service. Only public EOA addresses
// are sent to it. No key, mnemonic, swap secret or credentials leave this process.
const host = 'https://openfaucet.org';
const rpc = process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org';
const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
const keys = JSON.parse(await readFile('./keys/wallets.json', 'utf8')) as { ownerPrivateKey: Hex }[];
if (keys.length !== 2 || await publicClient.getChainId() !== baseSepolia.id) throw new Error('Two new keys and Base Sepolia RPC are required');
const owners = keys.map(k => privateKeyToAccount(k.ownerPrivateKey));
const [first, second] = owners;
async function faucetClaim(address: `0x${string}`) {
  const response = await fetch(`${host}/api/session?chainId=BASE_SEPOLIA`, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Faucet session HTTP ${response.status}`);
  const session = await response.json() as {
    preimg: string; timestamp: number; chainId: string; difficulty: number;
    minimumClaim: number;
  };
  if (session.chainId !== 'BASE_SEPOLIA' || session.difficulty < 1 || session.minimumClaim <= 0) throw new Error('Unexpected faucet session');
  const sourceResponse = await fetch(`${host}/PoWMiner.js`, { signal: AbortSignal.timeout(20_000) });
  if (!sourceResponse.ok) throw new Error(`Faucet public miner HTTP ${sourceResponse.status}`);
  // Run the faucet's own publicly served browser PoW worker (embedded WASM),
  // adapted for Node worker_threads. Input contains only this public address.
  const source = `const {parentPort}=require('node:worker_threads');\nconsole.log=()=>{};\nglobalThis.self={postMessage:x=>parentPort.postMessage(x)};\nparentPort.on('message',x=>self.onmessage({data:x}));\n` + await sourceResponse.text();
  const count = Math.ceil(session.minimumClaim / 0.002);
  const nonces: string[] = [];
  const workers: Worker[] = [];
  console.log(`Mining ${count} faucet proofs for ${address} (no keys sent)`);
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Faucet mining exceeded 8 minutes')), 8 * 60_000);
      for (let id = 0; id < 4; id++) {
        const worker = new Worker(source, { eval: true, execArgv: [] });
        workers.push(worker);
        worker.on('error', e => { clearTimeout(timer); reject(e); });
        worker.on('message', (data: { type?: string; nonce?: string; result?: string }) => {
          if (!data.nonce || !data.result || !data.result.startsWith('0'.repeat(session.difficulty))) return;
          if (!nonces.includes(data.nonce) && nonces.length < count) {
            nonces.push(data.nonce);
            console.log(`Faucet proofs: ${nonces.length}/${count}`);
          }
          if (nonces.length === count) { clearTimeout(timer); resolve(); }
        });
        worker.postMessage({ id, action: 'start', preimg: session.preimg, timestamp: session.timestamp,
          wallet: address, token: session.chainId, difficulty: session.difficulty });
      }
    });
  } finally { await Promise.all(workers.map(w => w.terminate())); }
  const claimResponse = await fetch(`${host}/api/claim/evm`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chainId: session.chainId, wallet: address, nonces, timestamp: session.timestamp }),
    signal: AbortSignal.timeout(30_000),
  });
  const result = await claimResponse.json() as { status?: string; code?: string; message?: string; transactionHash?: Hex; claimAmount?: number };
  if (result.status !== 'SUCCESS' || !result.transactionHash) throw new Error(`Faucet claim HTTP ${claimResponse.status}: ${JSON.stringify(result)}`);
  console.log('Faucet claim accepted:', result.transactionHash, 'amount:', result.claimAmount);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: result.transactionHash, timeout: 120_000 });
  if (receipt.status !== 'success') throw new Error(`Faucet receipt reverted: ${result.transactionHash}`);
  console.log('Faucet confirmed:', result.transactionHash);
}

try {
  let a = await publicClient.getBalance({ address: first.address });
  if (a < parseEther('0.005')) await faucetClaim(first.address);
  a = await publicClient.getBalance({ address: first.address });
  const b = await publicClient.getBalance({ address: second.address });
  console.log('owner 1 balance:', formatEther(a), 'owner 2 balance:', formatEther(b));
  if (b < parseEther('0.003')) {
    if (a < parseEther('0.004')) throw new Error('Faucet did not provide enough free testnet ETH for both gas payers');
    const client = createWalletClient({ account: first, chain: baseSepolia, transport: http(rpc) });
    const hash = await client.sendTransaction({ to: second.address, value: parseEther('0.003') - b });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(`Gas-payer transfer reverted: ${hash}`);
    console.log('Owner 2 funded from new owner 1:', hash);
  }
} catch (error) {
  console.error('Faucet funding failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
