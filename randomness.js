/**
 * Randomness Provider Interface
 * 
 * All providers implement pickRandomIndex(n) → index in [0, n)
 * The concrete provider is swapped in at startup via env or config.
 * When QVRF ships its API, implement QuipQVRFProvider following the stub below.
 */

import crypto from 'node:crypto';

// ─── Interface (documented contract) ────────────────────────────────────────
/**
 * @typedef {Object} RandomnessProvider
 * @method pickRandomIndex(n) - returns a promise resolving to an integer in [0, n)
 */

// ─── CSPRNG fallback (default) ──────────────────────────────────────────────
export class CSPRNGProvider {
  name = 'CSPRNG (node:crypto.randomBytes)';
  
  /**
   * Pick a random index in [0, n) using rejection sampling on crypto.randomBytes
   * for uniform distribution without modulo bias.
   */
  async pickRandomIndex(n) {
    if (!Number.isInteger(n) || n <= 0) throw new RangeError('n must be a positive integer');
    
    // Rejection sampling: find the largest multiple of n <= 2^bits
    const bits = Math.ceil(Math.log2(n));
    const byteLen = Math.ceil(bits / 8);
    const maxValid = (1 << (byteLen * 8)) - ((1 << (byteLen * 8)) % n);
    
    while (true) {
      const buf = crypto.randomBytes(byteLen);
      const val = buf.readUIntBE(0, byteLen);
      if (val < maxValid) return val % n;
    }
  }
}

// ─── Quip QVRF stub (not yet callable) ──────────────────────────────────────
/**
 * TODO: When QVRF publishes its API (see developers.quip.network/docs/compute/qvrf),
 * implement this class. Based on the docs, the flow will be:
 * 
 * 1. POST to QVRF coordinator with:
 *    - payment (via QuipSwap rail, any supported chain)
 *    - request for N random bytes / a random seed
 * 2. Receive quantum-random output + transcript (seed_manifest, merkle_root, etc.)
 * 3. Extract randomness from transcript (Toeplitz extractor)
 * 
 * Until then, this class throws on construction.
 */
export class QuipQVRFProvider {
  name = 'Quip QVRF (not yet available)';
  
  constructor({ rpcUrl, keystorePath } = {}) {
    throw new Error(
      'QVRF API is not yet public. See: https://developers.quip.network/docs/compute/qvrf\n' +
      'The request interface is not yet final and no installable packages exist.\n' +
      'Quip\'s own note: "Integration documentation with installable packages and code\n' +
      'examples will follow once those details settle."\n' +
      'To integrate when available:\n' +
      '  1. npm install will need a @quip.network/qvrf package (does not exist yet)\n' +
      '  2. Set QVRF_RPC_URL to the coordinator WebSocket endpoint\n' +
      '  3. Fund an account via QuipSwap\n' +
      '  4. Request randomness; it comes back as a transcript with Merkle root + audit score'
    );
  }
  
  async pickRandomIndex(n) {
    throw new Error('Not implemented — QVRF API not yet public');
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────
export function createProvider() {
  const backend = process.env.RANDOMNESS_BACKEND || 'cspng';
  switch (backend) {
    case 'qvrf':
      return new QuipQVRFProvider({
        rpcUrl: process.env.QVRF_RPC_URL,
        keystorePath: process.env.QVRF_KEYSTORE,
      });
    case 'cspng':
    default:
      return new CSPRNGProvider();
  }
}
