import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, chmodSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const VILLAGE_DIR = join(homedir(), '.village');
const HOOKS_DIR = join(VILLAGE_DIR, 'hooks');
const EVENTS_DIR = join(VILLAGE_DIR, 'events');
const BACKUPS_DIR = join(VILLAGE_DIR, 'backups');
const HOOK_SCRIPT = join(HOOKS_DIR, 'fire-hook.sh');

type ToolName = 'claude' | 'cursor' | 'codex';
type ToolStatus = 'configured' | 'available' | 'not_installed';
type EnableResult = 'ok' | 'manual' | 'not_installed' | 'error';

export interface HookStatus {
  claude: ToolStatus;
  cursor: ToolStatus;
  codex: ToolStatus;
}

export interface EnableResultMap {
  claude: { status: EnableResult; snippet?: string; error?: string };
  cursor: { status: EnableResult; snippet?: string; error?: string };
  codex: { status: EnableResult; snippet?: string; error?: string };
}

const HOOK_SCRIPT_CONTENT = `#!/bin/bash
INPUT=$(cat)
STATUS=$(echo "$INPUT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('status', d.get('reason', '')))
" 2>/dev/null)
if [ "$STATUS" = "error" ]; then
  echo "$INPUT" > ~/.village/events/fire-$(date +%s%N).json
fi
exit 0
`;

export function ensureVillageDirs(): void {
  for (const dir of [VILLAGE_DIR, HOOKS_DIR, EVENTS_DIR, BACKUPS_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

export function getHookStatus(): HookStatus {
  return {
    claude: getToolStatus('claude'),
    cursor: getToolStatus('cursor'),
    codex: getToolStatus('codex'),
  };
}

function getToolStatus(tool: ToolName): ToolStatus {
  const configPath = getConfigPath(tool);
  const toolDir = getToolDir(tool);

  if (!existsSync(toolDir)) return 'not_installed';
  if (!existsSync(HOOK_SCRIPT)) return 'available';

  try {
    const content = readFileSync(configPath, 'utf-8');
    if (content.includes('fire-hook.sh')) return 'configured';
  } catch {
    // Config file doesn't exist yet — tool is installed but not configured
  }

  return 'available';
}

function getToolDir(tool: ToolName): string {
  switch (tool) {
    case 'claude': return join(homedir(), '.claude');
    case 'cursor': return join(homedir(), '.cursor');
    case 'codex': return join(homedir(), '.codex');
  }
}

function getConfigPath(tool: ToolName): string {
  switch (tool) {
    case 'claude': return join(homedir(), '.claude', 'settings.json');
    case 'cursor': return join(homedir(), '.cursor', 'hooks.json');
    case 'codex': return join(homedir(), '.codex', 'config.toml');
  }
}

export function enableHooks(): EnableResultMap {
  ensureVillageDirs();

  writeFileSync(HOOK_SCRIPT, HOOK_SCRIPT_CONTENT, { mode: 0o755 });
  chmodSync(HOOK_SCRIPT, 0o755);

  return {
    claude: enableClaude(),
    cursor: enableCursor(),
    codex: enableCodex(),
  };
}

function enableClaude(): EnableResultMap['claude'] {
  const toolDir = getToolDir('claude');
  if (!existsSync(toolDir)) return { status: 'not_installed' };

  const configPath = getConfigPath('claude');
  const hookEntry = {
    hooks: {
      Stop: [{
        matcher: '',
        hooks: [{
          type: 'command',
          command: '~/.village/hooks/fire-hook.sh',
        }],
      }],
    },
  };

  try {
    if (!existsSync(configPath)) {
      writeFileSync(configPath, JSON.stringify(hookEntry, null, 2) + '\n');
      return { status: 'ok' };
    }

    const content = readFileSync(configPath, 'utf-8');
    if (content.includes('fire-hook.sh')) return { status: 'ok' };

    const config = JSON.parse(content);

    if (config.hooks) {
      const snippet = JSON.stringify(hookEntry.hooks.Stop[0], null, 2);
      return {
        status: 'manual',
        snippet: `Add to the "Stop" array in your hooks config:\n${snippet}`,
      };
    }

    backupFile(configPath, 'claude-settings.json');
    config.hooks = hookEntry.hooks;
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', error: String(err) };
  }
}

function enableCursor(): EnableResultMap['cursor'] {
  const toolDir = getToolDir('cursor');
  if (!existsSync(toolDir)) return { status: 'not_installed' };

  const configPath = getConfigPath('cursor');
  const hookEntry = {
    version: 1,
    hooks: {
      sessionEnd: [{
        command: '~/.village/hooks/fire-hook.sh',
      }],
    },
  };

  try {
    if (!existsSync(configPath)) {
      writeFileSync(configPath, JSON.stringify(hookEntry, null, 2) + '\n');
      return { status: 'ok' };
    }

    const content = readFileSync(configPath, 'utf-8');
    if (content.includes('fire-hook.sh')) return { status: 'ok' };

    const config = JSON.parse(content);

    if (config.hooks?.sessionEnd) {
      const snippet = JSON.stringify(hookEntry.hooks.sessionEnd[0], null, 2);
      return {
        status: 'manual',
        snippet: `Add to the "sessionEnd" array in ~/.cursor/hooks.json:\n${snippet}`,
      };
    }

    backupFile(configPath, 'cursor-hooks.json');
    if (!config.hooks) config.hooks = {};
    config.hooks.sessionEnd = hookEntry.hooks.sessionEnd;
    if (!config.version) config.version = 1;
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', error: String(err) };
  }
}

function enableCodex(): EnableResultMap['codex'] {
  const toolDir = getToolDir('codex');
  if (!existsSync(toolDir)) return { status: 'not_installed' };

  const configPath = getConfigPath('codex');
  const hookBlock = '\n[[hooks.stop]]\ncommand = ["~/.village/hooks/fire-hook.sh"]\n';

  try {
    if (!existsSync(configPath)) {
      writeFileSync(configPath, hookBlock.trimStart());
      return { status: 'ok' };
    }

    const content = readFileSync(configPath, 'utf-8');
    if (content.includes('fire-hook.sh')) return { status: 'ok' };

    if (content.includes('[hooks') || content.includes('hooks.')) {
      return {
        status: 'manual',
        snippet: `Add to your ~/.codex/config.toml:\n${hookBlock.trim()}`,
      };
    }

    backupFile(configPath, 'codex-config.toml');
    writeFileSync(configPath, content.trimEnd() + '\n' + hookBlock);
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', error: String(err) };
  }
}

function backupFile(filePath: string, backupName: string): void {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = join(BACKUPS_DIR, `${ts}_${backupName}`);
  copyFileSync(filePath, dest);
}

export function disableHooks(): { claude: string; cursor: string; codex: string } {
  const result = { claude: 'skipped', cursor: 'skipped', codex: 'skipped' };

  for (const tool of ['claude', 'cursor', 'codex'] as ToolName[]) {
    const configPath = getConfigPath(tool);
    try {
      if (!existsSync(configPath)) {
        result[tool] = 'no_config';
        continue;
      }

      if (tool === 'codex') {
        const content = readFileSync(configPath, 'utf-8');
        const cleaned = content
          .replace(/\n?\[\[hooks\.stop\]\]\s*\ncommand\s*=\s*\["~\/\.village\/hooks\/fire-hook\.sh"\]\s*\n?/g, '');
        writeFileSync(configPath, cleaned);
        result[tool] = 'removed';
      } else {
        const content = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        let modified = false;

        if (tool === 'claude' && config.hooks?.Stop) {
          config.hooks.Stop = config.hooks.Stop.filter(
            (h: { hooks?: Array<{ command?: string }> }) =>
              !h.hooks?.some(hh => hh.command?.includes('fire-hook.sh'))
          );
          if (config.hooks.Stop.length === 0) delete config.hooks.Stop;
          if (Object.keys(config.hooks).length === 0) delete config.hooks;
          modified = true;
        }

        if (tool === 'cursor' && config.hooks?.sessionEnd) {
          config.hooks.sessionEnd = config.hooks.sessionEnd.filter(
            (h: { command?: string }) => !h.command?.includes('fire-hook.sh')
          );
          if (config.hooks.sessionEnd.length === 0) delete config.hooks.sessionEnd;
          if (Object.keys(config.hooks).length === 0) delete config.hooks;
          modified = true;
        }

        if (modified) {
          writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
          result[tool] = 'removed';
        }
      }
    } catch {
      result[tool] = 'error';
    }
  }

  try {
    if (existsSync(HOOK_SCRIPT)) unlinkSync(HOOK_SCRIPT);
  } catch { /* ignore */ }

  return result;
}
