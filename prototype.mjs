import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createPublicClient, createWalletClient, http, keccak256, encodeAbiParameters, toHex, padHex, isAddress, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { ShrincsSigner, getShrincsAddresses, getShrincsWalletAddress, v1Commitment, ShrincsFactoryClient } from '@quip.network/ethereum-sdk/v1/shrincs';
import { getNetworkAddresses } from '@quip.network/ethereum-sdk/v1';

const DIR = new URL('./keys/', import.meta.url);
const FILE = new URL('./keys/throwaway.json', import.meta.url);
const APPROVAL = new URL('./approval.json', import.meta.url);
const RPC = process.env.BASE_SEPOLIA_RPC ?? 'https://sepolia.base.org';
const chainId = 84532;
const maxSignatures = 8;
const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC, { timeout: 20000, retryCount: 1 }) });
const jwrite = async (url, value, mode) => writeFile(url, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode });
const keys = async () => JSON.parse(await readFile(FILE, 'utf8'));
const identity = async (k) => {
  const signer = await ShrincsSigner.create(Buffer.from(k.pqMasterSeed.slice(2), 'hex'));
  const main = signer.recoverKeyPair(0, { maxSignatures });
  const erc1271 = signer.recoverKeyPair(1, { maxSignatures });
  const owner = privateKeyToAccount(k.eoaPrivateKey);
  const factory = getNetworkAddresses(chainId).WalletFactory;
  const address = getShrincsWalletAddress(factory, main.publicKeyCommitment, erc1271.publicKeyCommitment, owner.address);
  return { signer, main, erc1271, owner, factory, address, commitment: v1Commitment(main.publicKeyCommitment, erc1271.publicKeyCommitment, owner.address) };
};
async function init() {
  await mkdir(DIR, { recursive: true, mode: 0o700 });
  const k = { warning: 'Throwaway Base Sepolia ONLY; never send real funds', eoaPrivateKey: toHex(randomBytes(32)), pqMasterSeed: toHex(randomBytes(32)) };
  await jwrite(FILE, k, 0o600);
  const i = await identity(k);
  console.log(JSON.stringify({ chainId, owner: i.owner.address, accountCounterfactual: i.address, factory: i.factory, mainCommitment: i.main.publicKeyCommitment, erc1271Commitment: i.erc1271.publicKeyCommitment, identityCommitment: i.commitment }, null, 2));
}
async function probe() {
  const i = await identity(await keys());
  const actualChain = await publicClient.getChainId();
  if (actualChain !== chainId) throw new Error(`WRONG CHAIN: ${actualChain}`);
  const addresses = { WalletFactory: i.factory, ...getShrincsAddresses(chainId), account: i.address };
  const code = {};
  for (const [name, address] of Object.entries(addresses)) code[name] = { address, deployed: !!(await publicClient.getCode({ address })) };
  const ownerBalance = await publicClient.getBalance({ address: i.owner.address });
  const accountBalance = await publicClient.getBalance({ address: i.address });
  const walletClient = createWalletClient({ account: i.owner, chain: baseSepolia, transport: http(RPC) });
  let creationEstimate;
  if (code.WalletFactory.deployed) {
    const factoryClient = new ShrincsFactoryClient({ publicClient, walletClient, account: i.owner.address, chainId });
    try {
      const result = await factoryClient.estimateCreationCost({ signer: i.signer, maxSignatures, derivationIndex: 0, erc1271: { derivationIndex: 1 } });
      creationEstimate = Object.fromEntries(Object.entries(result).map(([k,v]) => [k, typeof v === 'bigint' ? String(v) : v]));
    } catch (e) { creationEstimate = { error: String(e.shortMessage ?? e.message).slice(0,1000) }; }
  }
  console.log(JSON.stringify({ rpc: RPC, actualChain, code, ownerBalanceWei: String(ownerBalance), accountBalanceWei: String(accountBalance), creationEstimate }, null, 2));
}
// Authorization is an OFF-CHAIN policy artifact; QuipSwap does not accept this format.
const policy = (recipient, amountWei, nonce) => ({ schema: 'quip-dao-payout-v1', chainId, account: null, recipient, amountWei: String(amountWei), nonce });
const contextFor = p => ({ domainSeparator: keccak256(toHex('QUIP_DAO_TREASURY_APPROVAL_V1')), nonce: keccak256(toHex(p.nonce)), keyVersion: padHex('0x00', { size: 32 }), actionType: keccak256(toHex('PAYOUT_APPROVAL')), payloadHash: keccak256(toHex(JSON.stringify(p))) });
async function approve(recipient, amountWei) {
  if (!isAddress(recipient)) throw new Error('Invalid recipient');
  if (!/^[1-9]\d*$/.test(amountWei)) throw new Error('Positive integer wei required');
  const i = await identity(await keys());
  const p = policy(recipient, amountWei, toHex(randomBytes(32)));
  p.account = i.address;
  const context = contextFor(p);
  const signature = i.erc1271.signStatelessAction(context);
  if (!i.erc1271.verifyStatelessAction(context, signature)) throw new Error('Local signature verification failed');
  const artifact = { policy: p, signerPublicKey: i.erc1271.publicKey, context, signature, note: 'Off-chain signed approval ONLY, not ERC-1271 ABI signature nor executable QuipSwap order. Replay control is integrator responsibility.' };
  await jwrite(APPROVAL, artifact, 0o600);
  console.log(JSON.stringify({ approvalFile: 'approval.json', policy: p, publicKeyCommitment: i.erc1271.publicKeyCommitment, verified: true, signatureBytesJson: JSON.stringify(signature).length }, null, 2));
}
async function verify(file = 'approval.json') {
  const a = JSON.parse(await readFile(file, 'utf8'));
  const i = await identity(await keys());
  const matches = a.policy.chainId === chainId && a.policy.account.toLowerCase() === i.address.toLowerCase() && a.signerPublicKey.publicKeyCommitment === i.erc1271.publicKeyCommitment && JSON.stringify(contextFor(a.policy)) === JSON.stringify(a.context);
  const verified = matches && i.erc1271.verifyStatelessAction(a.context, a.signature);
  console.log(JSON.stringify({ verified, matches, recipient: a.policy.recipient, amountWei: a.policy.amountWei, nonce: a.policy.nonce }, null, 2));
  if (!verified) process.exitCode = 1;
}
async function deploy() {
  const i = await identity(await keys());
  if (await publicClient.getChainId() !== chainId) throw new Error('wrong chain');
  const balance = await publicClient.getBalance({ address: i.owner.address });
  if (balance === 0n) throw new Error(`BLOCKED: new throwaway owner ${i.owner.address} has 0 Base Sepolia ETH; fund only with testnet faucet ETH, then retry`);
  const walletClient = createWalletClient({ account: i.owner, chain: baseSepolia, transport: http(RPC) });
  const factoryClient = new ShrincsFactoryClient({ publicClient, walletClient, account: i.owner.address, chainId });
  const wallet = await factoryClient.createShrincsWallet({ signer: i.signer, maxSignatures, derivationIndex: 0, erc1271: { derivationIndex: 1 } });
  console.log(JSON.stringify({ deployed: wallet.walletAddress, expected: i.address }));
}
const [command, ...args] = process.argv.slice(2);
try {
  if (command === 'init') await init();
  else if (command === 'probe') await probe();
  else if (command === 'approve') await approve(...args);
  else if (command === 'verify') await verify(...args);
  else if (command === 'deploy') await deploy();
  else throw new Error('Usage: node prototype.mjs init|probe|approve <recipient> <wei>|verify|deploy');
} catch (e) { console.error(String(e.stack ?? e)); process.exitCode = 1; }
