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
import { FireEventWatcher } from './watchers/fireEventWatcher.js';
import { StateManager } from './stateManager.js';
import { humanizeTexts } from './services/humanizer.js';
import { exec } from 'child_process';
import { getHookStatus, enableHooks, disableHooks } from './services/hookSetup.js';
import type { ServerToClientEvents, ClientToServerEvents, AgentSource, SessionMeta } from '../../shared/types.js';

const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.json());

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

const fireEventWatcher = new FireEventWatcher(stateManager);

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

app.get('/api/hooks/status', (_req, res) => {
  res.json(getHookStatus());
});

app.post('/api/hooks/enable', (_req, res) => {
  const result = enableHooks();
  res.json(result);
});

app.post('/api/hooks/disable', (_req, res) => {
  const result = disableHooks();
  res.json(result);
});

app.post('/api/open-session', (req, res) => {
  const { source, sessionMeta } = req.body as { source: AgentSource; sessionMeta: SessionMeta };

  if (!sessionMeta?.projectPath) {
    res.json({ ok: false, error: 'Missing projectPath' });
    return;
  }

  const safePath = sessionMeta.projectPath.replace(/'/g, "'\\''");

  let cmd: string;
  switch (source) {
    case 'cursor':
      cmd = `open -a "Cursor" '${safePath}'`;
      break;
    case 'claude-code':
      if (sessionMeta.sessionId) {
        cmd = `open -a "Terminal" '${safePath}'`;
      } else {
        cmd = `open -a "Terminal" '${safePath}'`;
      }
      break;
    case 'codex':
      cmd = `open -a "Terminal" '${safePath}'`;
      break;
    default:
      res.json({ ok: false, error: `Unknown source: ${source}` });
      return;
  }

  exec(cmd, (err) => {
    if (err) {
      console.error(`[open-session] Failed to open session:`, err.message);
      res.json({ ok: false, error: err.message });
    } else {
      res.json({ ok: true, source });
    }
  });
});

cursorWatcher.start();
claudeWatcher.start();
codexWatcher.start();
fireEventWatcher.start();

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
  fireEventWatcher.stop();
  httpServer.close();
  process.exit(0);
});
