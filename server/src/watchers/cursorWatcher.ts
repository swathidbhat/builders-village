import { watch } from 'chokidar';
import { readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { parseTerminalFile } from '../utils/parseTerminal.js';
import { parseTranscriptDir, parseTranscriptFile } from '../utils/parseTranscript.js';
import { extractProjectName, dirNameToPath } from '../utils/projectName.js';
import type { Agent, AgentStatus, Project } from '../../../shared/types.js';

export type CursorWatcherCallback = (projects: Map<string, Project>) => void;

const ONE_HOUR_MS = 60 * 60 * 1000;

export class CursorWatcher {
  private cursorBase: string;
  private projects = new Map<string, Project>();
  private onChange: CursorWatcherCallback;
  private watcher: ReturnType<typeof watch> | null = null;

  constructor(onChange: CursorWatcherCallback) {
    this.cursorBase = join(homedir(), '.cursor', 'projects');
    this.onChange = onChange;
  }

  start(): void {
    if (!existsSync(this.cursorBase)) {
      console.log('[CursorWatcher] No .cursor/projects directory found, skipping');
      return;
    }

    this.scan();

    const watchPaths = [
      join(this.cursorBase, '*/terminals/*.txt'),
      join(this.cursorBase, '*/agent-transcripts/**/*.jsonl'),
    ];

    this.watcher = watch(watchPaths, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    });

    this.watcher.on('add', () => this.scan());
    this.watcher.on('change', () => this.scan());
    this.watcher.on('unlink', () => this.scan());

    console.log(`[CursorWatcher] Watching ${this.cursorBase}`);
  }

  stop(): void {
    this.watcher?.close();
  }

  private scan(): void {
    this.projects.clear();

    let projectDirs: string[];
    try {
      projectDirs = readdirSync(this.cursorBase, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
    } catch {
      return;
    }

    for (const dirName of projectDirs) {
      if (/^\d+$/.test(dirName)) continue;

      const projectPath = join(this.cursorBase, dirName);
      const agents: Agent[] = [];

      const terminalsDir = join(projectPath, 'terminals');
      if (existsSync(terminalsDir)) {
        try {
          const terminalFiles = readdirSync(terminalsDir).filter(f => f.endsWith('.txt'));
          for (const file of terminalFiles) {
            const data = parseTerminalFile(join(terminalsDir, file));
            if (!data) continue;

            let status: AgentStatus;
            if (data.isRunning) {
              status = 'working';
            } else if (data.exitCode !== undefined) {
              status = 'done';
            } else {
              status = 'waiting';
            }

            agents.push({
              id: `cursor-terminal-${data.pid}`,
              name: `Terminal ${data.pid}`,
              status,
              source: 'cursor',
              currentTask: data.command || undefined,
              lastAction: data.command || undefined,
              startedAt: data.startedAt,
              elapsedMs: data.startedAt
                ? Date.now() - new Date(data.startedAt).getTime()
                : undefined,
            });
          }
        } catch {
          // skip unreadable dirs
        }
      }

      const transcriptsDir = join(projectPath, 'agent-transcripts');
      if (existsSync(transcriptsDir)) {
        try {
          const entries = readdirSync(transcriptsDir, { withFileTypes: true });

          for (const entry of entries) {
            if (entry.isDirectory()) {
              const subDir = join(transcriptsDir, entry.name);
              const data = parseTranscriptDir(subDir);
              if (!data) continue;

              const agentId = `cursor-agent-${entry.name}`;
              if (agents.some(a => a.id === agentId)) continue;

              let status: AgentStatus;
              if (data.isRecentlyActive) {
                status = 'working';
              } else {
                const ageMs = Date.now() - data.lastActivityMs;
                status = ageMs < ONE_HOUR_MS ? 'waiting' : 'done';
              }

              agents.push({
                id: agentId,
                name: `Agent ${entry.name.slice(0, 8)}`,
                status,
                source: 'cursor',
                currentTask: data.userQuery,
                lastAction: data.lastAction,
              });
            } else if (entry.name.endsWith('.txt')) {
              const data = parseTranscriptFile(join(transcriptsDir, entry.name));
              if (!data) continue;

              const agentId = `cursor-agent-${basename(entry.name, '.txt')}`;
              if (agents.some(a => a.id === agentId)) continue;

              let status: AgentStatus;
              if (data.isRecentlyActive) {
                status = 'working';
              } else {
                const ageMs = Date.now() - data.lastActivityMs;
                status = ageMs < ONE_HOUR_MS ? 'waiting' : 'done';
              }

              agents.push({
                id: agentId,
                name: `Agent ${basename(entry.name, '.txt').slice(0, 8)}`,
                status,
                source: 'cursor',
                currentTask: data.userQuery,
                lastAction: data.lastAction,
              });
            }
          }
        } catch {
          // skip
        }
      }

      if (agents.length === 0) continue;

      const name = extractProjectName(dirName);
      const path = dirNameToPath(dirName);

      this.projects.set(dirName, {
        id: `cursor-${dirName}`,
        name,
        path,
        agents,
        gridPosition: { x: 0, y: 0 },
      });
    }

    this.onChange(new Map(this.projects));
  }
}
