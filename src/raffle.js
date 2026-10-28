// Raffle lifecycle: open -> closed (commitment anchored on chain) -> drawn (secret revealed).
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { entriesHash, commitment, deriveSeed, pickWinners, canonicalEntries } from './draw.js';
import { getProvider } from './entropy.js';

// The beacon block is this many blocks after the commitment block, so it is unknown when we commit.
export const BEACON_DELAY = Number(process.env.BEACON_DELAY || 3);

export class RaffleService {
  constructor({ chain, dataFile = './data/raffles.json', entropy = process.env.ENTROPY || 'csprng' }) {
    this.chain = chain;
    this.dataFile = dataFile;
    this.entropy = getProvider(entropy);
    this.entropyName = entropy;
    this.raffles = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : {};
  }

  save() {
    mkdirSync('./data', { recursive: true });
    writeFileSync(this.dataFile, JSON.stringify(this.raffles, null, 2));
  }

  create({ name, winners = 1 }) {
    const id = randomUUID();
    this.raffles[id] = { id, name, winners, entries: [], state: 'open', createdAt: new Date().toISOString() };
    this.save();
    return this.view(id);
  }

  enter(id, entryId) {
    const r = this.mustGet(id);
    if (r.state !== 'open') throw httpErr(409, 'raffle is not open');
    entryId = String(entryId).trim();
    if (!entryId) throw httpErr(400, 'entry id required');
    if (r.entries.includes(entryId)) throw httpErr(409, 'already entered');
    r.entries.push(entryId);
    this.save();
    return this.view(id);
  }

  // Freeze entries, pick a secret, anchor H(secret, entries) on chain.
  async close(id) {
    const r = this.mustGet(id);
    if (r.state !== 'open') throw httpErr(409, 'already closed');
    if (r.entries.length < r.winners) throw httpErr(400, 'fewer entries than winners');
    const secret = await this.entropy.secret(); // QvrfNotAvailableError propagates when ENTROPY=qvrf
    const eh = entriesHash(r.entries);
    const commit = commitment({ raffleId: r.id, entriesHash: eh, secret });
    const anchor = await this.chain.publishCommitment(commit);
    Object.assign(r, {
      state: 'closed',
      entriesHash: eh,
      commitment: commit,
      anchor: { ...anchor, beaconBlock: anchor.blockNumber + BEACON_DELAY },
      entropy: { provider: this.entropyName, label: this.entropy.label, quantum: this.entropy.quantum },
      _secret: secret, // kept server-side until the draw
    });
    this.save();
    return this.view(id);
  }

  async draw(id) {
    const r = this.mustGet(id);
    if (r.state === 'drawn') return this.view(id);
    if (r.state !== 'closed') throw httpErr(409, 'close the raffle first');
    const head = await this.chain.head();
    if (head < r.anchor.beaconBlock) throw httpErr(425, `beacon block ${r.anchor.beaconBlock} not yet produced (head ${head})`);
    const beaconHash = await this.chain.blockHash(r.anchor.beaconBlock);
    const seed = deriveSeed({ secret: r._secret, entriesHash: r.entriesHash, beaconHash });
    const winners = pickWinners({ seed, entries: r.entries, count: r.winners });
    Object.assign(r, { state: 'drawn', beaconHash, seed, winnerList: winners, secret: r._secret, drawnAt: new Date().toISOString() });
    delete r._secret;
    this.save();
    return this.view(id);
  }

  // Public verification bundle: everything a third party needs, plus our own check against the chain.
  async verify(id) {
    const r = this.mustGet(id);
    if (r.state !== 'drawn') throw httpErr(409, 'not drawn yet');
    const checks = {};
    checks.entriesHash = entriesHash(r.entries) === r.entriesHash;
    checks.commitment = commitment({ raffleId: r.id, entriesHash: r.entriesHash, secret: r.secret }) === r.commitment;
    const tx = await this.chain.getTx(r.anchor.txHash);
    checks.commitmentOnChain = !!tx && tx.data.toLowerCase() === r.commitment.toLowerCase();
    checks.beaconAfterCommit = r.anchor.beaconBlock > r.anchor.blockNumber;
    const bh = await this.chain.blockHash(r.anchor.beaconBlock);
    checks.beaconHashMatchesChain = bh === r.beaconHash;
    const seed = deriveSeed({ secret: r.secret, entriesHash: r.entriesHash, beaconHash: bh });
    checks.winnersRecomputed = JSON.stringify(pickWinners({ seed, entries: r.entries, count: r.winners })) === JSON.stringify(r.winnerList);
    return { ok: Object.values(checks).every(Boolean), checks };
  }

  mustGet(id) {
    const r = this.raffles[id];
    if (!r) throw httpErr(404, 'no such raffle');
    return r;
  }

  view(id) {
    const { _secret, ...pub } = this.mustGet(id);
    pub.entries = canonicalEntries(pub.entries);
    return pub;
  }
}

export function httpErr(status, message) {
  return Object.assign(new Error(message), { status });
}
