/**
 * Quip Network QVRF Raffle Service
 * 
 * HTTP API for running raffles. Currently uses CSPRNG (crypto.randomBytes)
 * because QVRF is not yet publicly accessible.
 * 
 * Switch to quantum randomness by setting RANDOMNESS_BACKEND=qvrf
 * (requires QVRF_API_KEY and QVRF_RPC_URL when the API ships).
 */

import express from 'express';
import { createRaffle, addEntry, pickWinner, getRaffle, listRaffles } from './raffle.js';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'quip-raffle',
    note: 'Randomness from node:crypto CSPRNG. QVRF integration pending Quip Network API release.',
  });
});

// List all raffles
app.get('/raffles', (_req, res) => {
  res.json(listRaffles());
});

// Create a raffle
app.post('/raffles', (req, res) => {
  try {
    const raffle = createRaffle(req.body);
    res.status(201).json(raffle);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Add entry to a raffle
app.post('/raffles/:id/entries', (req, res) => {
  try {
    const raffle = addEntry(req.params.id, req.body);
    res.json(raffle);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Pick winner
app.post('/raffles/:id/draw', async (req, res) => {
  try {
    const { raffle, winnerIndex } = await pickWinner(req.params.id);
    res.json({ winner: raffle.winner, winnerIndex, totalEntries: raffle.entries.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get single raffle
app.get('/raffles/:id', (req, res) => {
  const raffle = getRaffle(req.params.id);
  if (!raffle) return res.status(404).json({ error: 'Not found' });
  res.json(raffle);
});

const PORT = process.env.PORT || 3456;
app.listen(PORT, () => {
  console.log(`Quip raffle service on http://localhost:${PORT}`);
});
