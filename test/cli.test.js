import assert from 'node:assert/strict';
import { test } from 'node:test';
import sdk from '../dist/quip-sdk.cjs';
import { lamports } from '../src/cli.js';

const { QuipSigner, getFactoryAddress, QUIP_PROGRAM_ID, getWalletAddress } = sdk;

test('SOL decimal amounts are parsed exactly and invalid values rejected', () => {
  assert.equal(lamports('0.000000001'), 1n);
  assert.equal(lamports('1.123456789'), 1123456789n);
  for (const raw of ['0', '-1', '1e3', '0.0000000001', '1.2.3', ' 1', '1.', '18446744073.709551616']) {
    assert.throws(() => lamports(raw), /Amount/);
  }
});

test('Quip SDK address and PQ signing/recovery work offline', () => {
  assert.equal(QUIP_PROGRAM_ID.toBase58(), 'Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj');
  assert.equal(getFactoryAddress()[0].toBase58(), 'A9pdWuTNwG3Br6E8yqEJFWis3PgjJJqR471EEUa6uUV4');
  const signer = new QuipSigner(new Uint8Array(32).fill(42)); // offline-only test vector, never a testnet key
  const vault = new Uint8Array(32).fill(13);
  const pair = signer.generateKeyPair(vault);
  const recovered = signer.recoverKeyPair(vault, pair.publicKey.publicSeed);
  assert.deepEqual(recovered.publicKey.publicKeyHash, pair.publicKey.publicKeyHash);
  assert.equal(signer.sign(new Uint8Array(32).fill(5), vault, pair.publicKey.publicSeed).length > 0, true);
  assert.equal(typeof getWalletAddress, 'function');
});
