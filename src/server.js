import { createApp } from './app.js';
const port = Number(process.env.PORT || 3000);
const server = createApp({ dataDir: process.env.DATA_DIR || './data' });
server.listen(port, '127.0.0.1', () => console.log(`Raffle API on http://127.0.0.1:${port}`));
