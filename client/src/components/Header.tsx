import type { VillageState } from '@shared/types';

interface Props {
  state: VillageState;
  connected: boolean;
}

export function Header({ state, connected }: Props) {
  const totalWorkers = state.projects.reduce((sum, p) => sum + p.agents.length, 0);
  const workingCount = state.projects.reduce(
    (sum, p) => sum + p.agents.filter(a => a.status === 'active').length,
    0
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-30 pointer-events-none">
      <div className="flex items-center justify-between px-5 py-3">
        {/* Title */}
        <div className="pointer-events-auto bg-village-900 rounded-lg px-4 py-2 border border-village-700">
          <h1 className="font-pixel text-sm text-white tracking-wider">
            Builder&apos;s Village
          </h1>
        </div>

        {/* Stats */}
        <div className="pointer-events-auto flex items-center gap-4 bg-village-900 rounded-lg px-4 py-2 border border-village-700">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-pixel text-white/70">Shops</span>
            <span className="text-xs font-pixel text-white">{state.projects.length}</span>
          </div>
          <div className="w-px h-4 bg-village-600" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-pixel text-white/70">Workers</span>
            <span className="text-xs font-pixel text-white">{totalWorkers}</span>
          </div>
          <div className="w-px h-4 bg-village-600" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-pixel text-green-400">Working</span>
            <span className="text-xs font-pixel text-green-400">{workingCount}</span>
          </div>
          <div className="w-px h-4 bg-village-600" />
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
        </div>
      </div>
    </header>
  );
}
