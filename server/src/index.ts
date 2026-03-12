import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { CursorWatcher } from './watchers/cursorWatcher.js';
import { ClaudeWatcher } from './watchers/claudeWatcher.js';
import { StateManager } from './stateManager.js';
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

stateManager.on('change', (state) => {
  io.emit('village:state', state);
});

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.emit('village:state', stateManager.getState());

  socket.on('village:request-state', () => {
    socket.emit('village:state', stateManager.getState());
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

httpServer.listen(PORT, () => {
  console.log(`[Server] Builder's Village server running on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  cursorWatcher.stop();
  claudeWatcher.stop();
  httpServer.close();
  process.exit(0);
});
