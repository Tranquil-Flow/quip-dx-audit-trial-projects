// Entropy providers. A provider supplies the *secret* that the operator commits
// to before the public beacon block is known.
import { randomBytes } from 'node:crypto';

export class QvrfNotAvailableError extends Error {
  constructor() {
    super(
      'Quip QVRF (quantum randomness) has no public request interface yet. ' +
        'Quip docs (https://developers.quip.network/docs/compute/qvrf.md): "The request interface is ' +
        'not yet final, so no function names or parameters appear here." Access is by contact form only. ' +
        'Use ENTROPY=csprng until Quip publishes integration docs.',
    );
    this.name = 'QvrfNotAvailableError';
    this.code = 'QVRF_NOT_AVAILABLE';
  }
}

export const providers = {
  // Working today. NOT quantum: OS CSPRNG.
  csprng: {
    label: 'os-csprng (not quantum)',
    quantum: false,
    async secret() {
      return '0x' + randomBytes(32).toString('hex');
    },
  },
  // Placeholder for Quip QVRF. Deliberately fails instead of guessing an endpoint.
  // When Quip ships the interface, implement secret() here (request seed, await callback/delivery,
  // and check it against the on-chain commitment) and nothing else in the service needs to change.
  qvrf: {
    label: 'quip-qvrf (quantum) - NOT AVAILABLE',
    quantum: true,
    async secret() {
      throw new QvrfNotAvailableError();
    },
  },
};

export function getProvider(name = 'csprng') {
  const p = providers[name];
  if (!p) throw new Error(`unknown entropy provider "${name}" (have: ${Object.keys(providers).join(', ')})`);
  return p;
}
