import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { ShrincsSigner, ShrincsFactoryClient } from '@quip.network/ethereum-sdk/v1/shrincs';
import { resolveDeployment, createOmnibusClient } from '@quip.network/quip-swap-sdk';

const root = new URL('../', import.meta.url);
const keydir = new URL('keys/', root);
const seedpath = new URL('keys/shrincs.seed', root);
const rpc = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
const expectedEOA = '0xA501da7ADB0b48AEa2cC48799051ddDe20A1eAe5';
export const walletParams = { maxSignatures: 16, derivationIndex: 0, erc1271: { derivationIndex: 1 } };

export async function loadContext() {
  const key = (await readFile(new URL('keys/wallet.key', root), 'utf8')).trim();
  if (!/^(?:0x)?[a-f\d]{64}$/i.test(key)) throw new Error('Invalid wallet.key format (must be 32-byte hex)');
  const eoa = privateKeyToAccount(key.startsWith('0x') ? key : `0x${key}`);
  if (eoa.address.toLowerCase() !== expectedEOA.toLowerCase()) throw new Error('wallet.key does not match expected throwaway EOA');
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpc, { timeout: 30000 }) });
  const chainId = await publicClient.getChainId();
  if (chainId !== 84532) throw new Error(`Refusing to sign on chain ${chainId}: expected Base Sepolia 84532`);
  const localWalletClient = createWalletClient({ chain: baseSepolia, account: eoa, transport: http(rpc, { timeout: 30000 }) });
  // ethereum-sdk passes the EOA as an address string to writeContract, which makes
  // viem request eth_sendTransaction on a public RPC. Supply our LocalAccount.
  const walletClient = { ...localWalletClient, writeContract: async (args) => {
    const hash = await localWalletClient.writeContract({ ...args, account: eoa, chain: baseSepolia });
    console.log('Locally signed Base Sepolia transaction:', hash);
    return hash;
  } };
  const deployment = resolveDeployment(84532n);
  const code = await publicClient.getCode({ address: deployment.omnibusAddress });
  const factoryCode = await publicClient.getCode({ address: deployment.walletFactory });
  if (!code || code === '0x' || !factoryCode || factoryCode === '0x') throw new Error('Official Omnibus or WalletFactory has no code on Base Sepolia');
  const omnibus = createOmnibusClient({ address: deployment.omnibusAddress, publicClient, walletClient });
  if ((await omnibus.getWalletFactory()).toLowerCase() !== deployment.walletFactory.toLowerCase()) throw new Error('Official Omnibus factory mismatch');
  await mkdir(keydir, { recursive: true, mode: 0o700 });
  let seed;
  try { seed = await readFile(seedpath); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    seed = randomBytes(32);
    await writeFile(seedpath, seed, { mode: 0o600, flag: 'wx' });
  }
  await chmod(seedpath, 0o600);
  if (seed.length !== 32) throw new Error('shrincs.seed must be exactly 32 bytes');
  const signer = await ShrincsSigner.create(new Uint8Array(seed));
  const factory = new ShrincsFactoryClient({ publicClient, walletClient, account: eoa.address, chainId, factoryAddress: deployment.walletFactory });
  return { eoa, publicClient, walletClient, signer, factory, omnibus, deployment, rpc };
}

export async function ensureQuipWallet(ctx) {
  const { factory, signer, eoa, publicClient, omnibus } = ctx;
  let wallet;
  try { wallet = await factory.getShrincsWallet({ ...walletParams, owner: eoa.address, signer }); }
  catch (err) {
    if (err.name !== 'NoVaultFoundError') throw err;
    const estimate = await factory.estimateCreationCost({ ...walletParams, signer });
    const balance = await publicClient.getBalance({ address: eoa.address });
    const estimatedMax = estimate.creationFee + estimate.gasUnits * estimate.gasPrice;
    console.log(`Quip account creation: fee=${formatEther(estimate.creationFee)} ETH, estimated max=${formatEther(estimatedMax)} ETH; EOA balance=${formatEther(balance)} ETH`);
    if (balance <= estimatedMax) throw new Error('Insufficient EOA test ETH for Quip wallet creation fee plus gas');
    wallet = await factory.createShrincsWallet({ ...walletParams, signer });
    console.log(`Quip smart wallet deployed: ${wallet.walletAddress}`);
  }
  if (!(await omnibus.isQuipWallet(wallet.walletAddress))) throw new Error('Omnibus does not recognize Quip wallet in factory');
  console.log(`Base Sepolia EOA: ${eoa.address}; Quip wallet: ${wallet.walletAddress}`);
  return wallet;
}
