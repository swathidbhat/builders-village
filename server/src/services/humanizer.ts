interface CacheEntry {
  humanized: string;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();
const MAX_CACHE = 500;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const SYSTEM_PROMPT = `You translate coding-agent activity into short status labels (5-8 words) for a non-technical decision-making builder.

Rules:
- Use simple, everyday language to explain what an agent is currently doing that a non-engineer would understand
- Be specific about WHAT is happening, not HOW
- Never mention file extensions, CLI flags, or tool names
- Use verbs ("Adding...", "Fixing...", "Setting up...")
- If the input is gibberish, an XML tag, or nonsensical, respond with "Working"
- Do NOT add numbering, quotes, or any extra formatting — just the label`;

export interface HumanizeResult {
  texts: Record<string, string>;
  usedLLM: boolean;
}

/**
 * Humanize a list of raw agent-activity strings on demand.
 * Returns a map of raw → humanized plus a flag indicating whether the LLM was used.
 */
export async function humanizeTexts(rawTexts: string[]): Promise<HumanizeResult> {
  const texts: Record<string, string> = {};
  const uncached: string[] = [];

  for (const raw of rawTexts) {
    const cached = getFromCache(raw);
    if (cached) {
      texts[raw] = cached;
    } else {
      uncached.push(raw);
    }
  }

  if (uncached.length === 0) return { texts, usedLLM: true };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    for (const raw of uncached) {
      const fb = simpleFallback(raw);
      setInCache(raw, fb);
      texts[raw] = fb;
    }
    return { texts, usedLLM: false };
  }

  const BATCH_SIZE = 20;
  for (let start = 0; start < uncached.length; start += BATCH_SIZE) {
    const batch = uncached.slice(start, start + BATCH_SIZE);
    const batchResults = await callLLM(batch, apiKey);
    for (let i = 0; i < batch.length; i++) {
      const label = batchResults[i] || simpleFallback(batch[i]);
      setInCache(batch[i], label);
      texts[batch[i]] = label;
    }
  }

  return { texts, usedLLM: true };
}

async function callLLM(inputs: string[], apiKey: string): Promise<string[]> {
  try {
    const numbered = inputs.map((t, i) => `${i + 1}. ${t}`).join('\n');
    const model = process.env.HUMANIZER_MODEL || 'claude-haiku-4-5-20251001';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Translate each input:\n${numbered}` }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[Humanizer] API ${response.status}: ${body.slice(0, 200)}`);
      return inputs.map(simpleFallback);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text?: string }>;
    };
    const text = data.content.find(c => c.type === 'text')?.text || '';

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: string[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const line = lines[i];
      if (line) {
        parsed.push(line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, ''));
      } else {
        parsed.push(simpleFallback(inputs[i]));
      }
    }
    return parsed;
  } catch (err) {
    console.error('[Humanizer] LLM call failed:', err);
    return inputs.map(simpleFallback);
  }
}

const TOOL_VERBS: Record<string, string> = {
  Write: 'Writing', Read: 'Reading', Edit: 'Editing',
  Shell: 'Running', Bash: 'Running', Search: 'Searching',
  Grep: 'Searching', Glob: 'Finding files', WebSearch: 'Researching',
  WebFetch: 'Fetching a page', Task: 'Delegating work',
  TodoWrite: 'Planning tasks',
};

function simpleFallback(raw: string): string {
  let t = raw.trim();

  const colonIdx = t.indexOf(':');
  if (colonIdx > 0 && colonIdx < 20) {
    const tool = t.slice(0, colonIdx);
    const detail = t.slice(colonIdx + 1).trim();
    const verb = TOOL_VERBS[tool];
    if (verb) {
      if (!detail || detail === 'subtask') return verb;
      const short = detail.length > 25 ? detail.slice(0, 22) + '...' : detail;
      return `${verb} ${short}`;
    }
  }

  t = t.replace(/<[^>]+>/g, '').trim();
  if (!t || t.length < 2) return 'Working';

  if (t.length <= 40) return capitalizeFirst(t);
  const cut = t.slice(0, 37).replace(/\s+\S*$/, '');
  return capitalizeFirst(cut) + '...';
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getFromCache(raw: string): string | undefined {
  const entry = cache.get(raw);
  if (!entry) return undefined;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(raw);
    return undefined;
  }
  return entry.humanized;
}

function setInCache(raw: string, humanized: string): void {
  if (cache.size >= MAX_CACHE) {
    let oldest: string | undefined;
    let oldestTime = Infinity;
    for (const [key, entry] of cache) {
      if (entry.cachedAt < oldestTime) {
        oldestTime = entry.cachedAt;
        oldest = key;
      }
    }
    if (oldest) cache.delete(oldest);
  }
  cache.set(raw, { humanized, cachedAt: Date.now() });
}
