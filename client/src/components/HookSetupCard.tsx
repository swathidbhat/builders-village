import { useState, useEffect, useCallback } from 'react';

type ToolStatus = 'configured' | 'available' | 'not_installed';
type EnableResult = 'ok' | 'manual' | 'not_installed' | 'error';

interface HookStatusResponse {
  claude: ToolStatus;
  cursor: ToolStatus;
  codex: ToolStatus;
}

interface EnableToolResult {
  status: EnableResult;
  snippet?: string;
  error?: string;
}

interface EnableResponse {
  claude: EnableToolResult;
  cursor: EnableToolResult;
  codex: EnableToolResult;
}

const API_BASE = 'http://localhost:3001';
const TOOLS = ['claude', 'cursor', 'codex'] as const;
const TOOL_LABELS: Record<string, string> = {
  claude: 'Claude Code',
  cursor: 'Cursor',
  codex: 'Codex',
};

export function HookSetupCard() {
  const [status, setStatus] = useState<HookStatusResponse | null>(null);
  const [enableResult, setEnableResult] = useState<EnableResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('village:hook-setup-dismissed') === '1'
  );

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/hooks/status`);
      const data: HookStatusResponse = await res.json();
      setStatus(data);
    } catch {
      // server not reachable
    }
  }, []);

  useEffect(() => {
    if (!dismissed) fetchStatus();
  }, [dismissed, fetchStatus]);

  if (dismissed || !status) return null;

  const allConfigured = TOOLS.every(t => status[t] === 'configured' || status[t] === 'not_installed');
  const anyAvailable = TOOLS.some(t => status[t] === 'available');

  if (allConfigured && !enableResult) return null;

  const handleEnable = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/hooks/enable`, { method: 'POST' });
      const data: EnableResponse = await res.json();
      setEnableResult(data);
      await fetchStatus();
    } catch {
      // failed
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/hooks/disable`, { method: 'POST' });
      setEnableResult(null);
      await fetchStatus();
    } catch {
      // failed
    }
    setLoading(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('village:hook-setup-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 bg-village-900 border border-village-700 rounded-lg shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 border-b border-village-700">
        <h3 className="text-xs font-pixel text-orange-400">Agent Hooks</h3>
        <button
          onClick={handleDismiss}
          className="text-white/40 hover:text-white/70 text-sm leading-none"
          title="Dismiss"
        >
          ×
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-[10px] text-white/60">
          Get real-time agent status updates and error detection for your buildings.
        </p>

        <div className="space-y-1.5">
          {TOOLS.map(tool => (
            <ToolRow
              key={tool}
              tool={tool}
              status={status[tool]}
              result={enableResult?.[tool]}
            />
          ))}
        </div>

        <p className="text-[9px] text-yellow-500/70 italic">
          Codex hooks shipped in March 2026 and may not be available in older versions.
          If hooks don't work for Codex, update to the latest Codex CLI.
        </p>

        <div className="flex gap-2">
          {anyAvailable && !allConfigured && (
            <button
              onClick={handleEnable}
              disabled={loading}
              className="flex-1 text-[10px] font-pixel px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 transition-colors"
            >
              {loading ? 'Setting up...' : 'Enable Agent Hooks'}
            </button>
          )}
          {TOOLS.some(t => status[t] === 'configured') && (
            <button
              onClick={handleDisable}
              disabled={loading}
              className="text-[10px] font-pixel px-3 py-1.5 rounded border border-village-600 text-white/50 hover:text-white/80 hover:border-village-500 disabled:opacity-50 transition-colors"
            >
              Disable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolRow({
  tool,
  status,
  result,
}: {
  tool: string;
  status: ToolStatus;
  result?: EnableToolResult;
}) {
  const [showSnippet, setShowSnippet] = useState(false);
  const label = TOOL_LABELS[tool] || tool;

  let indicator: React.ReactNode;
  let statusText: string;

  if (status === 'not_installed') {
    indicator = <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />;
    statusText = 'Not installed';
  } else if (status === 'configured') {
    indicator = <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />;
    statusText = 'Configured';
  } else {
    indicator = <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />;
    statusText = 'Available';
  }

  if (result?.status === 'manual' && result.snippet) {
    statusText = 'Needs manual step';
    indicator = <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {indicator}
          <span className="text-[10px] font-pixel text-white/80">{label}</span>
        </div>
        <span className="text-[9px] text-white/40">{statusText}</span>
      </div>
      {result?.status === 'manual' && result.snippet && (
        <div className="mt-1">
          <button
            onClick={() => setShowSnippet(!showSnippet)}
            className="text-[9px] text-orange-400 hover:text-orange-300"
          >
            {showSnippet ? 'Hide' : 'Show'} manual steps
          </button>
          {showSnippet && (
            <pre className="mt-1 text-[8px] text-white/60 bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap">
              {result.snippet}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
