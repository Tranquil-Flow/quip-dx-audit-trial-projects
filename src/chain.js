// Quip Aglais testnet (EVM, chain id 20033) anchor. Testnet only; tokens have no value.
// Source: https://developers.quip.network/llms.txt
import { JsonRpcProvider, Wallet } from 'ethers';
import { readFileSync } from 'node:fs';

export const AGLAIS = {
  rpc: process.env.AGLAIS_RPC || 'https://evm-rpc.aglais.quip.network',
  chainId: 20033,
  explorer: 'https://explorer.aglais.quip.network',
  faucet: 'https://faucet.aglais.quip.network/request',
};

export function makeChain({ keyFile = process.env.KEY_FILE || './keys/testnet.json' } = {}) {
  const provider = new JsonRpcProvider(AGLAIS.rpc, AGLAIS.chainId, { staticNetwork: true });
  const { privateKey } = JSON.parse(readFileSync(keyFile, 'utf8'));
  const wallet = new Wallet(privateKey, provider);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  return {
    address: wallet.address,
    provider,
    // Publish the commitment as calldata of a zero-value self-transfer.
    async publishCommitment(commit) {
      const tx = await wallet.sendTransaction({ to: wallet.address, value: 0n, data: commit, gasPrice: 1_000_000_000n });
      const rcpt = await tx.wait(1, 120_000);
      return { txHash: tx.hash, blockNumber: rcpt.blockNumber, blockHash: rcpt.blockHash };
    },
    async getTx(hash) {
      const tx = await provider.getTransaction(hash);
      return tx && { from: tx.from, to: tx.to, data: tx.data, blockNumber: tx.blockNumber };
    },
    async head() {
      return provider.getBlockNumber();
    },
    async blockHash(n) {
      const b = await provider.getBlock(n);
      return b ? b.hash : null;
    },
    async waitForBlock(n, timeoutMs = 180_000) {
      const t0 = Date.now();
      for (;;) {
        const h = await this.blockHash(n);
        if (h) return h;
        if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting for block ${n}`);
        await sleep(2000);
      }
    },
  };
}
