import { execSync } from 'child_process';
import { readFileSync } from 'fs';

export interface TerminalData {
  pid: number;
  cwd: string;
  command: string;
  startedAt?: string;
  isRunning: boolean;
  exitCode?: number;
}

export function parseTerminalFile(filePath: string): TerminalData | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return parseTerminalContent(content);
  } catch {
    return null;
  }
}

export function parseTerminalContent(content: string): TerminalData | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  const frontmatter = frontmatterMatch[1];

  const pid = extractField(frontmatter, 'pid');
  const cwd = extractField(frontmatter, 'cwd');
  const command = extractField(frontmatter, 'command') || extractField(frontmatter, 'last_command');

  if (!pid || !cwd) return null;

  const startedAt = extractField(frontmatter, 'started_at');

  const hasExitCode = /^exit_code:/m.test(content) ||
                      content.includes('\n---\nexit_code:') ||
                      /\nexit_code:\s/m.test(content);

  const exitCodeMatch = content.match(/exit_code:\s*(\d+)/);
  const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : undefined;

  let isRunning = !hasExitCode;
  if (isRunning) {
    isRunning = isPidAlive(parseInt(pid, 10));
  }

  return {
    pid: parseInt(pid, 10),
    cwd: cwd.replace(/^["']|["']$/g, ''),
    command: command?.replace(/^["']|["']$/g, '') || '',
    startedAt,
    isRunning,
    exitCode,
  };
}

function extractField(text: string, field: string): string | undefined {
  const regex = new RegExp(`^${field}:\\s*(.+)$`, 'm');
  const match = text.match(regex);
  return match ? match[1].trim() : undefined;
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
