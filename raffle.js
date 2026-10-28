/**
 * Raffle Engine
 * 
 * Manages raffle lifecycle: create → add entries → pick winner.
 * Delegates randomness to the pluggable provider.
 */

import { createProvider } from './randomness.js';
import crypto from 'node:crypto';

const provider = createProvider();

// In-memory raffle store (would be a DB in production)
const raffles = new Map();

export function createRaffle({ title, entries = [] }) {
  const id = crypto.randomUUID();
  const raffle = {
    id,
    title: title || `Raffle ${id.slice(0, 8)}`,
    entries: [...entries],   // array of { name, address? }
    winner: null,
    createdAt: new Date().toISOString(),
    randomnessProvider: provider.name,
  };
  raffles.set(id, raffle);
  return raffle;
}

export function addEntry(raffleId, entry) {
  const raffle = raffles.get(raffleId);
  if (!raffle) throw new Error(`Raffle ${raffleId} not found`);
  if (raffle.winner) throw new Error('Raffle already closed');
  raffle.entries.push(entry);
  return raffle;
}

export async function pickWinner(raffleId) {
  const raffle = raffles.get(raffleId);
  if (!raffle) throw new Error(`Raffle ${raffleId} not found`);
  if (raffle.winner) throw new Error('Winner already picked');
  if (raffle.entries.length === 0) throw new Error('No entries');

  const idx = await provider.pickRandomIndex(raffle.entries.length);
  raffle.winner = {
    ...raffle.entries[idx],
    index: idx,
    drawnAt: new Date().toISOString(),
    randomnessSource: provider.name,
  };
  return { raffle, winnerIndex: idx };
}

export function getRaffle(raffleId) {
  return raffles.get(raffleId) || null;
}

export function listRaffles() {
  return [...raffles.values()];
}
