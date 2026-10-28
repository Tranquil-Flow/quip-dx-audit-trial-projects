import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildKeyedSigner, createOmnibusClient, createTerms, generateSecret,
  getSameChainSwapStatus, nativeAsset, planSameChainSwap, resolveDeployment,
  secretToPair, swapId, type Hex32, type Terms,
} from '@quip.network/quip-swap-sdk';
import {
  generateMnemonic, getShrincsAddresses, getShrincsWalletAddress,
  ShrincsFactoryClient, ShrincsSigner,
} from '@quip.network/ethereum-sdk/v1/shrincs';
import {
  createPublicClient, createWalletClient, formatEther, http, parseAbiItem, parseEther,
  type Address, type Hex,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// Only Base Sepolia: do not point this script at a mainnet chain.
const rpc = process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org';
const keysDir = join(process.cwd(), 'keys');
const keysFile = join(keysDir, 'wallets.json');
const secretFile = join(keysDir, 'swap-secret.json');
const stateFile = join(process.cwd(), 'run-state.json');
const chainId = baseSepolia.id;
const deployment = resolveDeployment(BigInt(chainId));
const publicClient = createPublicClient({ transport: http(rpc, { timeout: 20_000 }) });
const omnibus = createOmnibusClient({ address: deployment.omnibusAddress, publicClient });
type KeyRecord = { ownerPrivateKey: Hex; mnemonic: string };
type Keys = [KeyRecord, KeyRecord];

type Progress = { lock: Hex32; proposer: Terms; taker: Terms; proposerTx?: Hex; takerTx?: Hex; claimTx?: Hex };

const json = (value: unknown) => JSON.stringify(value, (_, v: unknown) => typeof v === 'bigint' ? v.toString() : v, 2);
async function privateWrite(path: string, value: unknown) {
  const file = await open(path, 'wx', 0o600); // Never overwrite throwaway keys.
  try { await file.writeFile(json(value) + '\n'); } finally { await file.close(); }
}
async function loadKeys(): Promise<Keys> {
  const keys = JSON.parse(await readFile(keysFile, 'utf8')) as Keys;
  if (keys.length !== 2) throw new Error('Expected two fresh keys in ./keys/wallets.json');
  return keys;
}
async function network() {
  const id = await publicClient.getChainId();
  if (id !== chainId) throw new Error(`Refusing non-Base-Sepolia RPC (chain ID ${id})`);
  for (const [name, address] of Object.entries({ omnibus: deployment.omnibusAddress, factory: deployment.walletFactory,
    implementation: getShrincsAddresses(chainId).ShrincsWalletImplementation })) {
    if (!address || await publicClient.getCode({ address }) === undefined) throw new Error(`${name} is not deployed at ${address}`);
  }
  const factory = await omnibus.getWalletFactory();
  if (factory.toLowerCase() !== deployment.walletFactory?.toLowerCase()) throw new Error('Omnibus wallet factory mismatch');
  console.log('chain:', id, 'Omnibus:', deployment.omnibusAddress, 'factory:', factory,
    'commit fee (wei):', (await omnibus.getCommitmentFee()).toString());
}
async function ownerContext(key: KeyRecord) {
  const owner = privateKeyToAccount(key.ownerPrivateKey);
  const rawWalletClient = createWalletClient({ chain: baseSepolia, account: owner, transport: http(rpc, { timeout: 20_000 }) });
  // Quip ethereum-sdk v0.3.0-beta.8 passes `account: this.account` as a bare
  // address to writeContract. Viem interprets that as a JSON-RPC-managed wallet
  // (eth_sendTransaction), which public RPCs cannot sign. Force our fresh local
  // account for *all* SDK writeContract calls without altering SDK source.
  const walletClient = new Proxy(rawWalletClient, {
    get(target, property, receiver) {
      if (property === 'writeContract') return (args: Record<string, unknown>) =>
        target.writeContract({ ...args, account: owner, chain: baseSepolia } as unknown as Parameters<typeof target.writeContract>[0]);
      return Reflect.get(target, property, receiver);
    },
  });
  const signer = await ShrincsSigner.fromMnemonic(key.mnemonic);
  const params = { signer, maxSignatures: 16, derivationIndex: 0, erc1271: { derivationIndex: 1, maxSignatures: 16 } };
  const factory = new ShrincsFactoryClient({ publicClient, walletClient, account: owner.address, chainId });
  const main = signer.recoverKeyPair(0, { maxSignatures: 16 });
  const erc1271 = signer.recoverKeyPair(1, { maxSignatures: 16 });
  const wallet = getShrincsWalletAddress(factory.factoryAddress, main.publicKeyCommitment, erc1271.publicKeyCommitment, owner.address);
  return { owner, walletClient, signer, params, factory, wallet, commitment: main.publicKeyCommitment };
}
async function wallets() {
  await mkdir(keysDir, { mode: 0o700 });
  const keys: Keys = [
    { ownerPrivateKey: generatePrivateKey(), mnemonic: generateMnemonic(256) },
    { ownerPrivateKey: generatePrivateKey(), mnemonic: generateMnemonic(256) },
  ];
  await privateWrite(keysFile, keys);
  console.log('Generated two independent Quip SHRINCS mnemonic seeds and two new gas-payer EOA keys; secrets stored only in ./keys/wallets.json.');
  for (const [i, key] of keys.entries()) {
    const c = await ownerContext(key);
    console.log(`side ${i + 1}: owner ${c.owner.address}; predicted Quip wallet ${c.wallet}; PQ commitment ${c.commitment}`);
  }
}
async function probe() {
  await network();
  const keys = await loadKeys();
  for (const [i, key] of keys.entries()) {
    const c = await ownerContext(key);
    const [ownerBalance, balance, code, registered] = await Promise.all([
      publicClient.getBalance({ address: c.owner.address }), publicClient.getBalance({ address: c.wallet }),
      publicClient.getCode({ address: c.wallet }), omnibus.isQuipWallet(c.wallet),
    ]);
    console.log(`side ${i + 1}: owner ${c.owner.address}, gas ETH ${formatEther(ownerBalance)}; Quip wallet ${c.wallet}, ETH ${formatEther(balance)}, deployed ${!!code}, factory registered ${registered}`);
    if (!code) {
      try {
        const cost = await c.factory.estimateCreationCost(c.params);
        console.log(`side ${i + 1}: Quip SDK wallet deploy estimate:`, json(cost));
      } catch (error) { console.log(`side ${i + 1}: Quip SDK wallet deploy estimation failed:`, shortError(error)); }
    }
  }
}
function shortError(error: unknown): string {
  const chain: string[] = [];
  let current = error;
  for (let i = 0; i < 5 && current instanceof Error; i++) {
    const e = current as Error & { code?: number | string; shortMessage?: string; details?: string; cause?: unknown };
    // Do not expose signed raw transactions, private keys or API payloads.
    const safe = (s: unknown) => String(s).replace(/0x[0-9a-fA-F]{64,}/g, '[redacted hex]').slice(0, 500);
    chain.push(`${e.name}${e.code === undefined ? '' : ` [${e.code}]`}: ${safe(e.shortMessage ?? e.message)}${e.details ? `; details: ${safe(e.details)}` : ''}`);
    current = e.cause;
  }
  return chain.length ? chain.join(' -> ') : String(error);
}
async function waitUntil(lower: bigint) {
  while (true) {
    const now = (await publicClient.getBlock()).timestamp;
    if (now >= lower) return;
    console.log(`Waiting for on-chain window: ${lower - now} seconds remaining`);
    await new Promise(resolve => setTimeout(resolve, 10_000));
  }
}
async function loadProgress(): Promise<Progress | null> {
  try {
    const p = JSON.parse(await readFile(stateFile, 'utf8')) as Progress;
    const revive = (t: Terms): Terms => createTerms({ ...t, chainId: BigInt(t.chainId), commitmentDeadline: BigInt(t.commitmentDeadline), claimDeadline: BigInt(t.claimDeadline), reclaimRelease: BigInt(t.reclaimRelease), assets: t.assets.map(a => ({ ...a, id: BigInt(a.id), amount: BigInt(a.amount) })) });
    return { ...p, proposer: revive(p.proposer), taker: revive(p.taker) };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}
async function save(p: Progress) { await writeFile(stateFile, json(p) + '\n', { mode: 0o600 }); }
function scheduledTerms(a: Address, b: Address, now: bigint) {
  // PQ wallet signing and public RPCs are slow. 10-minute windows are an
  // intentional testnet-only departure from the SDK's 30-minute default.
  const schedule = [600n, 1200n, 1800n, 2400n, 3000n, 3600n].map(n => now + n);
  const proposer = createTerms({ chainId: BigInt(chainId), reclaimRecipient: a, recipient: a,
    commitmentDeadline: schedule[0], claimDeadline: schedule[2], reclaimRelease: schedule[4], assets: [nativeAsset(1000n)] });
  const taker = createTerms({ chainId: BigInt(chainId), reclaimRecipient: b, recipient: b,
    commitmentDeadline: schedule[1], claimDeadline: schedule[3], reclaimRelease: schedule[5], assets: [nativeAsset(2000n)] });
  planSameChainSwap(proposer, taker, { minimumBufferSeconds: 600n });
  return { proposer, taker };
}
async function swap() {
  await network();
  const keys = await loadKeys();
  const contexts = await Promise.all(keys.map(ownerContext));
  const [a, b] = contexts;
  for (const [i, c] of contexts.entries()) {
    if (!await publicClient.getCode({ address: c.wallet })) {
      const cost = await c.factory.estimateCreationCost(c.params);
      const balance = await publicClient.getBalance({ address: c.owner.address });
      console.log(`side ${i + 1}: deployment cost estimate ${json(cost)}; owner ETH ${formatEther(balance)}`);
      if (balance === 0n) throw new Error(`side ${i + 1} owner unfunded: obtain FREE Base Sepolia ETH for ${c.owner.address}; no transactions broadcast`);
      const created = await c.factory.createShrincsWallet(c.params);
      if (created.walletAddress.toLowerCase() !== c.wallet.toLowerCase()) throw new Error('Deployed wallet address differs from prediction');
      console.log(`side ${i + 1}: Quip wallet deployed ${created.walletAddress}`);
    }
    // Public RPCs may lag behind the confirmed receipt; wait for the factory
    // view consumed by Omnibus rather than assuming cross-node immediacy.
    let registered = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      registered = await omnibus.isQuipWallet(c.wallet);
      if (registered) break;
      await new Promise(resolve => setTimeout(resolve, 3_000));
    }
    if (!registered) throw new Error(`side ${i + 1}: wallet not registered at Omnibus factory after 60 seconds`);
    // Quip factory SDK returns only wallet address, so read its public event for tx evidence.
    const tip = await publicClient.getBlockNumber();
    const logs = await publicClient.getLogs({ address: c.factory.factoryAddress,
      event: parseAbiItem('event WalletDeployed(uint256 amount, uint256 when, bytes32 indexed commitment, address indexed creator, address implementation, address indexed quip)'),
      args: { quip: c.wallet }, fromBlock: tip > 1000n ? tip - 1000n : 0n });
    console.log(`side ${i + 1}: confirmed factory registration; deployment tx ${logs.at(-1)?.transactionHash ?? 'event unavailable'}`);
    const balance = await publicClient.getBalance({ address: c.wallet });
    if (balance < parseEther('0.0001')) {
      const amount = parseEther('0.0001') - balance;
      const tx = await c.walletClient.sendTransaction({ to: c.wallet, value: amount });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== 'success') throw new Error(`wallet funding reverted: ${tx}`);
      console.log(`side ${i + 1}: funded Quip wallet: ${tx}`);
    }
  }
  let p = await loadProgress();
  if (!p) {
    const pair = generateSecret();
    await privateWrite(secretFile, { secret: pair.secret });
    p = { lock: pair.lock, ...scheduledTerms(a.wallet, b.wallet, (await publicClient.getBlock()).timestamp) };
    await save(p);
  } else if (!p.proposerTx && (await publicClient.getBlock()).timestamp >= p.proposer.commitmentDeadline) {
    // Regenerate only the public schedule (not the secret/key) when an attempt
    // expired without any on-chain commitment. Refuse if chain state disagrees.
    const oldId = swapId(p.lock, p.proposer, p.taker);
    if (await omnibus.getLockState(oldId) !== 0) throw new Error(`old swap ${oldId} has on-chain state; refusing to rotate terms`);
    const { secret } = JSON.parse(await readFile(secretFile, 'utf8')) as { secret: string };
    if (secretToPair(secret).lock !== p.lock) throw new Error('secret/lock mismatch');
    p = { lock: p.lock, ...scheduledTerms(a.wallet, b.wallet, (await publicClient.getBlock()).timestamp) };
    await save(p);
    console.log(`expired unused schedule rotated; prior swap ID ${oldId}`);
  }
  const plan = planSameChainSwap(p.proposer, p.taker, { minimumBufferSeconds: 600n });
  console.log('swap lock:', p.lock, 'swap ID:', swapId(p.lock, p.proposer, p.taker));
  const sides = [{ context: a, party: p.proposer, counterparty: p.taker, key: 'proposerTx' as const },
    { context: b, party: p.taker, counterparty: p.proposer, key: 'takerTx' as const }];
  for (const { context, party, counterparty, key } of sides) {
    if (p[key]) { console.log(`${key} already sent: ${p[key]}`); continue; }
    if (key === 'takerTx') {
      await waitUntil(plan.takerCommitWindow.lower);
      const s = await getSameChainSwapStatus(omnibus, p.lock, plan);
      if (s.status !== 'awaiting-taker-commit') throw new Error(`unsafe to take swap: ${s.status}`);
    }
    const wallet = await context.factory.getShrincsWallet({ ...context.params, owner: context.owner.address });
    const auth = { signer: buildKeyedSigner(getShrincsAddresses(chainId).ShrincsVerifier, context.commitment), signature: '0x' as Hex };
    const call = await omnibus.prepareCommit({ lock: p.lock, party, counterparty, auth }, { account: context.wallet });
    const receipt = await wallet.execute({ target: call.to, value: call.value, data: call.data });
    const decoded = await omnibus.waitForReceipt(receipt.transactionHash);
    if (decoded.receipt.status !== 'success' || decoded.commitments.length !== 1 ||
      decoded.commitments[0].sender.toLowerCase() !== context.wallet.toLowerCase())
      throw new Error(`expected one successful Quip wallet commitment in ${receipt.transactionHash}`);
    p[key] = receipt.transactionHash;
    await save(p);
    console.log(`${key}: ${receipt.transactionHash}; status ${decoded.receipt.status}`);
  }
  if (!p.claimTx) {
    await waitUntil(plan.claimWindow.lower);
    const s = await getSameChainSwapStatus(omnibus, p.lock, plan);
    if (s.status !== 'claimable') throw new Error(`unsafe to claim swap: ${s.status}`);
    const { secret } = JSON.parse(await readFile(secretFile, 'utf8')) as { secret: string };
    if (secretToPair(secret).lock !== p.lock) throw new Error('secret/lock mismatch');
    const payer = a.walletClient;
    const client = createOmnibusClient({ address: deployment.omnibusAddress, publicClient, walletClient: payer });
    const hash = await client.claim({ secret: secretToPair(secret).secret, party: p.proposer, counterparty: p.taker });
    const decoded = await client.waitForReceipt(hash);
    if (decoded.receipt.status !== 'success' || decoded.claims.length !== 2 ||
      ![a.wallet, b.wallet].every(address => decoded.claims.some(e => e.recipient.toLowerCase() === address.toLowerCase())))
      throw new Error(`expected two successful wallet settlement legs in ${hash}`);
    p.claimTx = hash; await save(p);
    console.log('claim tx:', hash, 'claim events:', decoded.claims.length, 'status:', decoded.receipt.status);
  }
  // Another public RPC backend can lag one block behind the confirmed receipt.
  for (let attempt = 0; attempt < 20; attempt++) {
    const status = await getSameChainSwapStatus(omnibus, p.lock, plan);
    if (status.status === 'settled') {
      console.log('final state:', json(status));
      return;
    }
    if (attempt === 19) throw new Error(`claim receipt confirmed, but settled chain state was not visible: ${status.status}`);
    await new Promise(resolve => setTimeout(resolve, 3_000));
  }
}

try {
  const mode = process.argv[2];
  if (mode === 'wallets') await wallets();
  else if (mode === 'probe') await probe();
  else if (mode === 'swap') await swap();
  else throw new Error('Usage: npm run wallets | npm run probe | npm run swap');
} catch (e) {
  console.error('FAILED:', shortError(e));
  process.exitCode = 1;
}
