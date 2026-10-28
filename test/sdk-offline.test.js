import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Keypair, Transaction } from '@solana/web3.js';
import sdk from '../dist/quip-sdk.cjs';

// Simulated RPC only: this test does NOT create a devnet account or produce a real tx hash.
const { QuipClient, QuipSigner, QUIP_PROGRAM_ID, INSTRUCTION_DISCRIMINATORS, getFactoryAddress } = sdk;

test('vendor SDK builds, signs, chunks and rotates a WOTS+ transfer (offline simulated RPC)', async () => {
  const payer = Keypair.fromSeed(new Uint8Array(32).fill(12)); // offline test vector, never used on-chain
  const recipient = Keypair.fromSeed(new Uint8Array(32).fill(22));
  const vault = Buffer.alloc(32, 4);
  const signer = new QuipSigner(new Uint8Array(32).fill(7));
  const [factory] = getFactoryAddress();
  let state = null;
  let transferCount = 0;
  let signatureBytes = 0;
  let storeChunks = 0;
  const signatures = [];
  const fakeConnection = {
    async getAccountInfo(address) {
      if (!state || !address.equals(walletAddress)) return null;
      const data = Buffer.alloc(161);
      factory.toBuffer().copy(data, 8);
      payer.publicKey.toBuffer().copy(data, 40);
      Buffer.from(state.publicSeed).copy(data, 72);
      Buffer.from(state.publicKeyHash).copy(data, 104);
      data.writeBigUInt64LE(BigInt(transferCount), 152);
      return { data };
    },
    async getLatestBlockhash() { return { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 100 }; },
    async sendRawTransaction(raw) {
      assert.ok(raw.length <= 1232, `Transaction exceeds Solana wire limit: ${raw.length}`);
      const tx = Transaction.from(raw);
      assert.ok(tx.verifySignatures(), 'The throwaway fee-payer must sign every chunk and transfer');
      for (const ix of tx.instructions.filter((instruction) => instruction.programId.equals(QUIP_PROGRAM_ID))) {
        if (ix.data.subarray(0, 8).equals(INSTRUCTION_DISCRIMINATORS.DEPOSIT_TO_WINTERNITZ)) {
          assert.equal(state, null);
          state = { publicSeed: ix.data.subarray(72, 104), publicKeyHash: ix.data.subarray(104, 136) };
          assert.equal(ix.data.readBigUInt64LE(136), 50_000_000n);
        } else if (ix.data.subarray(0, 8).equals(INSTRUCTION_DISCRIMINATORS.STORE_SIGNATURE)) {
          storeChunks += 1;
          signatureBytes += ix.data.readUInt32LE(8);
        } else if (ix.data.subarray(0, 8).equals(INSTRUCTION_DISCRIMINATORS.TRANSFER_WITH_WINTERNITZ)) {
          assert.equal(ix.data.readBigUInt64LE(104), 5_000_000n);
          state = { publicSeed: ix.data.subarray(40, 72), publicKeyHash: ix.data.subarray(72, 104) };
          transferCount += 1;
        }
      }
      const mockId = `offline-only-${signatures.length}`;
      signatures.push(mockId);
      return mockId;
    },
    async confirmTransaction() { return { value: { err: null } }; },
  };
  const adapter = {
    publicKey: payer.publicKey,
    async signAllTransactions(txs) { for (const tx of txs) tx.partialSign(payer); return txs; },
  };
  const client = new QuipClient(fakeConnection, adapter);
  const walletAddress = new sdk.PublicKey(await client.getWalletAddress(vault));
  await client.createWallet(vault, signer, 50_000_000n);
  const oldSeed = Buffer.from(state.publicSeed);
  const wallet = await client.getWallet(vault, signer);
  const result = await wallet.transferWithWinternitz(recipient.publicKey.toBase58(), 5_000_000n);
  assert.equal(result, signatures.at(-1));
  assert.equal(transferCount, 1);
  assert.ok(storeChunks > 1, 'WOTS signature must be uploaded in multiple transactions');
  assert.ok(signatureBytes > 1000, 'WOTS signature bytes must be stored before transfer');
  assert.notDeepEqual(Buffer.from(state.publicSeed), oldSeed, 'WOTS key must rotate after a transfer');
  assert.equal(await (await client.getWallet(vault, signer)).getAddress(), walletAddress.toBase58());
});
