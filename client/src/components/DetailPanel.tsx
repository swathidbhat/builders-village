import { useEffect, useState } from 'react';
import type { Project, Agent } from '@shared/types';

interface Props {
  project: Project | null;
  onClose: () => void;
}

export function DetailPanel({ project, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!project) return null;

  const activeCount = project.agents.filter(a => a.status === 'working').length;
  const idleCount = project.agents.length - activeCount;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-gray-900/95 backdrop-blur-sm border-l border-gray-700 z-50 overflow-y-auto shadow-2xl animate-slideIn">
        {/* Header */}
        <div className="p-5 border-b border-gray-700">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-white text-lg font-pixel"
          >
            x
          </button>
          <h2 className="font-pixel text-sm text-white mb-1 pr-8">{project.name}</h2>
          <p className="text-xs text-gray-400 font-mono truncate">{project.path}</p>
          <div className="flex gap-3 mt-3">
            <span className="text-xs font-pixel text-green-400">{activeCount} active</span>
            <span className="text-xs font-pixel text-gray-400">{idleCount} idle</span>
          </div>
        </div>

        {/* Agent cards */}
        <div className="p-4 space-y-3">
          {project.agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
          {project.agents.length === 0 && (
            <p className="text-gray-500 text-xs font-pixel text-center py-8">
              No agents detected
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        {/* Status indicator */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          agent.status === 'working'
            ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)] animate-pulse'
            : 'bg-gray-500'
        }`} />

        <span className="font-pixel text-[10px] text-white flex-1 truncate">
          {agent.name}
        </span>

        {/* Source badge */}
        <span className={`text-[9px] font-pixel px-2 py-0.5 rounded ${
          agent.source === 'cursor'
            ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
            : 'bg-orange-900/50 text-orange-300 border border-orange-700'
        }`}>
          {agent.source === 'cursor' ? 'Cursor' : 'Claude'}
        </span>
      </div>

      {/* Task description */}
      {agent.currentTask && (
        <div
          className="mt-2 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <p className={`text-xs text-gray-300 font-mono leading-relaxed ${
            expanded ? '' : 'line-clamp-2'
          }`}>
            {agent.currentTask}
          </p>
          {agent.currentTask.length > 80 && (
            <span className="text-[9px] text-gray-500 font-pixel mt-1 inline-block">
              {expanded ? '[ less ]' : '[ more ]'}
            </span>
          )}
        </div>
      )}

      {/* Elapsed time */}
      {agent.startedAt && (
        <div className="mt-2">
          <ElapsedTime startedAt={agent.startedAt} />
        </div>
      )}
    </div>
  );
}

function ElapsedTime({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const ms = Date.now() - new Date(startedAt).getTime();
      if (ms < 0) { setElapsed('just now'); return; }

      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        setElapsed(`${hours}h ${minutes % 60}m`);
      } else if (minutes > 0) {
        setElapsed(`${minutes}m ${seconds % 60}s`);
      } else {
        setElapsed(`${seconds}s`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="text-[9px] font-pixel text-gray-500">
      {elapsed}
    </span>
  );
}
