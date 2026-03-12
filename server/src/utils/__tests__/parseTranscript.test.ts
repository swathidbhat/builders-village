import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseTranscriptDir, parseTranscriptFile, parseClaudeSessionFile } from '../parseTranscript.js';

let tempDir: string;

beforeEach(() => {
  tempDir = join(tmpdir(), `village-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('parseTranscriptDir', () => {
  it('extracts user query and last action from JSONL', () => {
    const jsonl = [
      JSON.stringify({ role: 'user', message: { content: 'Add a login page' } }),
      JSON.stringify({ role: 'assistant', message: { content: 'I will create a login page for you.' } }),
    ].join('\n');
    writeFileSync(join(tempDir, 'transcript.jsonl'), jsonl);

    const result = parseTranscriptDir(tempDir);
    expect(result).not.toBeNull();
    expect(result!.userQuery).toBe('Add a login page');
    expect(result!.lastAction).toBe('I will create a login page for you.');
  });

  it('returns null for empty directory', () => {
    expect(parseTranscriptDir(tempDir)).toBeNull();
  });

  it('returns null for directory with empty JSONL', () => {
    writeFileSync(join(tempDir, 'transcript.jsonl'), '');
    expect(parseTranscriptDir(tempDir)).toBeNull();
  });

  it('extracts first user query even with multiple user messages', () => {
    const jsonl = [
      JSON.stringify({ role: 'user', message: { content: 'First question' } }),
      JSON.stringify({ role: 'assistant', message: { content: 'Here is my answer.' } }),
      JSON.stringify({ role: 'user', message: { content: 'Second question' } }),
      JSON.stringify({ role: 'assistant', message: { content: 'Another answer.' } }),
    ].join('\n');
    writeFileSync(join(tempDir, 'transcript.jsonl'), jsonl);

    const result = parseTranscriptDir(tempDir);
    expect(result!.userQuery).toBe('First question');
    expect(result!.lastAction).toBe('Another answer.');
  });

  it('skips malformed JSON lines gracefully', () => {
    const jsonl = [
      '{ broken json',
      JSON.stringify({ role: 'user', message: { content: 'Hello' } }),
      'also broken {{{',
      JSON.stringify({ role: 'assistant', message: { content: 'Hi there.' } }),
    ].join('\n');
    writeFileSync(join(tempDir, 'transcript.jsonl'), jsonl);

    const result = parseTranscriptDir(tempDir);
    expect(result).not.toBeNull();
    expect(result!.userQuery).toBe('Hello');
  });
});

describe('parseTranscriptFile (legacy)', () => {
  it('extracts user query from <user_query> tags', () => {
    const content = `Some header text
<user_query>
Fix the broken checkout flow
</user_query>
More text here`;
    const filePath = join(tempDir, 'transcript.txt');
    writeFileSync(filePath, content);

    const result = parseTranscriptFile(filePath);
    expect(result).not.toBeNull();
    expect(result!.userQuery).toBe('Fix the broken checkout flow');
  });

  it('returns null when no user_query tags exist', () => {
    const filePath = join(tempDir, 'transcript.txt');
    writeFileSync(filePath, 'Just some plain text');
    expect(parseTranscriptFile(filePath)).toBeNull();
  });

  it('truncates long queries to 200 chars', () => {
    const longQuery = 'a'.repeat(300);
    const content = `<user_query>${longQuery}</user_query>`;
    const filePath = join(tempDir, 'transcript.txt');
    writeFileSync(filePath, content);

    const result = parseTranscriptFile(filePath);
    expect(result!.userQuery.length).toBe(200);
  });
});

describe('parseClaudeSessionFile', () => {
  it('extracts session data from Claude Code JSONL', () => {
    const now = new Date().toISOString();
    const jsonl = [
      JSON.stringify({ sessionId: 'sess-123', cwd: '/Users/me/project', type: 'user', message: { content: 'Build an API' }, timestamp: now }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'I will build the API.' }] }, timestamp: now }),
    ].join('\n');
    const filePath = join(tempDir, 'session.jsonl');
    writeFileSync(filePath, jsonl);

    const result = parseClaudeSessionFile(filePath);
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe('sess-123');
    expect(result!.cwd).toBe('/Users/me/project');
    expect(result!.latestTask).toBe('Build an API');
  });

  it('extracts tool_use as lastAction', () => {
    const now = new Date().toISOString();
    const jsonl = [
      JSON.stringify({ sessionId: 'sess-456', cwd: '/project', type: 'user', message: { content: 'Fix the bug' }, timestamp: now }),
      JSON.stringify({ type: 'assistant', message: { content: [
        { type: 'text', text: 'Let me fix that.' },
        { type: 'tool_use', name: 'Write', input: { file_path: 'src/app.ts' } },
      ] }, timestamp: now }),
    ].join('\n');
    const filePath = join(tempDir, 'session.jsonl');
    writeFileSync(filePath, jsonl);

    const result = parseClaudeSessionFile(filePath);
    expect(result!.lastAction).toBe('Write:app.ts');
  });

  it('returns null for empty file', () => {
    const filePath = join(tempDir, 'empty.jsonl');
    writeFileSync(filePath, '');
    expect(parseClaudeSessionFile(filePath)).toBeNull();
  });

  it('returns null when no sessionId found', () => {
    const jsonl = JSON.stringify({ type: 'user', message: { content: 'hello' } });
    const filePath = join(tempDir, 'nosession.jsonl');
    writeFileSync(filePath, jsonl);
    expect(parseClaudeSessionFile(filePath)).toBeNull();
  });

  it('formats Shell tool_use with command text', () => {
    const now = new Date().toISOString();
    const jsonl = [
      JSON.stringify({ sessionId: 's1', cwd: '/p', type: 'user', message: { content: 'run tests' }, timestamp: now }),
      JSON.stringify({ type: 'assistant', message: { content: [
        { type: 'tool_use', name: 'Shell', input: { command: 'npm test' } },
      ] }, timestamp: now }),
    ].join('\n');
    const filePath = join(tempDir, 'session.jsonl');
    writeFileSync(filePath, jsonl);

    const result = parseClaudeSessionFile(filePath);
    expect(result!.lastAction).toBe('Shell:npm test');
  });
});
