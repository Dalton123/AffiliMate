'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Project } from '@affilimate/types';

interface ProjectContextType {
  project: Project | null;
  isLoading: boolean;
  error: Error | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function initProject() {
      try {
        const res = await fetch('/api/admin/projects');
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to load project');
        }
        const data = await res.json();
        setProject(data.project);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }
    initProject();
  }, []);

  return (
    <ProjectContext.Provider value={{ project, isLoading, error }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
