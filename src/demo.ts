import { randomBytes } from 'node:crypto';
import { loadShrincsWasm } from '@quip.network/hashsigs-wasm';

// This is a local, disposable key only: do not reuse a stateful leaf or this
// key across process restarts. Production signers must persist state atomically.
const message = 'Quip post-quantum signatures for our EVM dApp';
const tampered = 'Quip post-quantum signatures for our EVM dApp!';
const hex = (text: string): string => Buffer.from(text, 'utf8').toString('hex');

async function main(): Promise<void> {
  const wasm = await loadShrincsWasm();
  const seed = randomBytes(32); // brand-new CSPRNG seed; never print or persist
  const keypair = wasm.shrincsKeygen(seed.toString('hex'), 2);
  seed.fill(0); // best effort; immutable JS hex string may still linger in memory
  try {
    const publicKey = keypair.publicKey();
    const { signature, nextStatefulLeafIndex } = keypair.signStatefulRaw(hex(message));
    const valid = wasm.shrincsVerifyStatefulRaw(
      publicKey.publicKeyCommitment, publicKey, hex(message), signature,
    );
    const invalid = wasm.shrincsVerifyStatefulRaw(
      publicKey.publicKeyCommitment, publicKey, hex(tampered), signature,
    );

    console.log(`Quip WASM version: ${wasm.version()}`);
    console.log(`Public key commitment: ${publicKey.publicKeyCommitment}`);
    console.log(`Message: ${message}`);
    console.log(`Signature counter: ${signature.counter}; next stateful leaf: ${nextStatefulLeafIndex}`);
    console.log(`Original message verifies: ${valid}`);
    console.log(`Tampered message verifies: ${invalid}`);
    if (!valid || invalid) throw new Error('Signature verification assertions failed');
  } finally {
    keypair.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
