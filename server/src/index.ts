import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
dotenv.config({ path: [path.join(root, '.env.local'), path.join(root, '.env')] });
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { CursorWatcher } from './watchers/cursorWatcher.js';
import { ClaudeWatcher } from './watchers/claudeWatcher.js';
import { CodexWatcher } from './watchers/codexWatcher.js';
import { StateManager } from './stateManager.js';
import { humanizeTexts } from './services/humanizer.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../../shared/types.js';

const PORT = 3001;

const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

const stateManager = new StateManager();

const cursorWatcher = new CursorWatcher((projects) => {
  stateManager.updateCursorProjects(projects);
});

const claudeWatcher = new ClaudeWatcher((projects) => {
  stateManager.updateClaudeProjects(projects);
});

const codexWatcher = new CodexWatcher((projects) => {
  stateManager.updateCodexProjects(projects);
});

stateManager.on('change', (state) => {
  io.emit('village:state', state);
});

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.emit('village:state', stateManager.getState());

  socket.on('village:request-state', () => {
    socket.emit('village:state', stateManager.getState());
  });

  socket.on('village:humanize', async (texts, callback) => {
    try {
      const result = await humanizeTexts(texts);
      callback(result);
    } catch (err) {
      console.error('[WS] Humanize error:', err);
      callback({ texts: {}, usedLLM: false });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', state: stateManager.getState() });
});

cursorWatcher.start();
claudeWatcher.start();
codexWatcher.start();

httpServer.listen(PORT, () => {
  console.log(`[Server] Builder's Village server running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[Server] ANTHROPIC_API_KEY not set — Human Lingo will use basic fallback. Add it to .env at the project root.');
  }
});

process.on('SIGINT', () => {
  cursorWatcher.stop();
  claudeWatcher.stop();
  codexWatcher.stop();
  httpServer.close();
  process.exit(0);
});
