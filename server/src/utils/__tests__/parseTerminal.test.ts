import { describe, it, expect } from 'vitest';
import { parseTerminalContent } from '../parseTerminal.js';

const activeTerminal = `---
pid: ${process.pid}
cwd: /Users/swathibhat/Documents/GitHub/my-project
last_command: npm run dev
started_at: 2026-03-10T10:00:00Z
---
Starting dev server...
Listening on port 3000`;

const completedTerminal = `---
pid: 99999
cwd: /Users/swathibhat/Documents/GitHub/my-project
last_command: npm test
---
Running tests...
All tests passed.
exit_code: 0`;

const failedTerminal = `---
pid: 88888
cwd: /Users/swathibhat/Documents/GitHub/my-project
last_command: npm run build
---
Build failed.
exit_code: 1`;

describe('parseTerminalContent', () => {
  it('parses active terminal with running PID', () => {
    const result = parseTerminalContent(activeTerminal);
    expect(result).not.toBeNull();
    expect(result!.pid).toBe(process.pid);
    expect(result!.cwd).toBe('/Users/swathibhat/Documents/GitHub/my-project');
    expect(result!.command).toBe('npm run dev');
    expect(result!.isRunning).toBe(true);
    expect(result!.exitCode).toBeUndefined();
  });

  it('parses completed terminal with exit code 0', () => {
    const result = parseTerminalContent(completedTerminal);
    expect(result).not.toBeNull();
    expect(result!.isRunning).toBe(false);
    expect(result!.exitCode).toBe(0);
    expect(result!.command).toBe('npm test');
  });

  it('parses failed terminal with non-zero exit code', () => {
    const result = parseTerminalContent(failedTerminal);
    expect(result).not.toBeNull();
    expect(result!.isRunning).toBe(false);
    expect(result!.exitCode).toBe(1);
  });

  it('returns null for content without frontmatter', () => {
    const result = parseTerminalContent('just some random text\nno yaml here');
    expect(result).toBeNull();
  });

  it('returns null for frontmatter missing pid', () => {
    const content = `---
cwd: /some/path
last_command: ls
---
output`;
    expect(parseTerminalContent(content)).toBeNull();
  });

  it('returns null for frontmatter missing cwd', () => {
    const content = `---
pid: 12345
last_command: ls
---
output`;
    expect(parseTerminalContent(content)).toBeNull();
  });

  it('strips quotes from cwd', () => {
    const content = `---
pid: ${process.pid}
cwd: "/path/with spaces/project"
last_command: ls
---
output`;
    const result = parseTerminalContent(content);
    expect(result).not.toBeNull();
    expect(result!.cwd).toBe('/path/with spaces/project');
  });

  it('detects dead PID as not running', () => {
    const content = `---
pid: 9999999
cwd: /some/path
last_command: sleep 100
---
output`;
    const result = parseTerminalContent(content);
    expect(result).not.toBeNull();
    expect(result!.isRunning).toBe(false);
  });
});
