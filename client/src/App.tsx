import { useState, useCallback } from 'react';
import { VillageCanvas } from './components/VillageCanvas.js';
import { InteriorView } from './components/InteriorView.js';
import { Header } from './components/Header.js';
import { useVillageState } from './hooks/useVillageState.js';
import type { Project } from '@shared/types';

export function App() {
  const { state, connected } = useVillageState();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleStoreClick = useCallback((project: Project) => {
    setSelectedProject(project);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedProject(null);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-village-950">
      <Header state={state} connected={connected} />
      <VillageCanvas state={state} onStoreClick={handleStoreClick} />
      {selectedProject && (
        <InteriorView project={selectedProject} onClose={handleClosePanel} />
      )}
    </div>
  );
}
