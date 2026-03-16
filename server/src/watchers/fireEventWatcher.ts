import { watch } from 'chokidar';
import { readFileSync, unlinkSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { StateManager } from '../stateManager.js';
import { ensureVillageDirs } from '../services/hookSetup.js';
import type { AgentSource } from '../../../shared/types.js';

const EVENTS_DIR = join(homedir(), '.village', 'events');

export class FireEventWatcher {
  private watcher: ReturnType<typeof watch> | null = null;
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  start(): void {
    ensureVillageDirs();

    this.processExistingEvents();

    this.watcher = watch(EVENTS_DIR, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    this.watcher.on('add', (filePath) => {
      if (filePath.endsWith('.json')) this.processEvent(filePath);
    });
    this.watcher.on('change', (filePath) => {
      if (filePath.endsWith('.json')) this.processEvent(filePath);
    });

    console.log(`[FireEventWatcher] Watching ${EVENTS_DIR}`);
  }

  stop(): void {
    this.watcher?.close();
  }

  private processExistingEvents(): void {
    try {
      const files = readdirSync(EVENTS_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        this.processEvent(join(EVENTS_DIR, file));
      }
    } catch { /* directory may not exist yet */ }
  }

  private processEvent(filePath: string): void {
    try {
      if (!existsSync(filePath)) return;
      const content = readFileSync(filePath, 'utf-8');
      const event = JSON.parse(content);

      const source = this.detectSource(event);
      const sessionId = event.session_id || event.sessionId || '';
      const reason = event.error_message || event.reason || event.status || 'Session ended with error';
      const cwd = event.cwd || event.working_directory || undefined;

      this.stateManager.reportFireEvent(source, sessionId, reason, cwd);

      unlinkSync(filePath);
    } catch (err) {
      console.error('[FireEventWatcher] Error processing event:', err);
      try { unlinkSync(filePath); } catch { /* ignore */ }
    }
  }

  private detectSource(event: Record<string, unknown>): AgentSource {
    if (event.reason !== undefined || event.error_message !== undefined) return 'cursor';
    if (event.tool === 'codex' || event.source === 'codex') return 'codex';
    return 'claude-code';
  }
}
