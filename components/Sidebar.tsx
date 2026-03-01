'use client';

import { db, type Project } from '@/lib/db';

interface SidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onDeleteProject?: (project: Project) => void | Promise<void>;
  onProjectCreated?: (project: Project) => void | Promise<void>;
}

export default function Sidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onDeleteProject,
  onProjectCreated,
}: SidebarProps) {
  const handleCreateProject = async () => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: 'Nuevo proyecto',
      created_at: new Date().toISOString(),
    };

    try {
      await db.projects.put(newProject);
      if (onProjectCreated) {
        await onProjectCreated(newProject);
      }
      onSelectProject(newProject.id);
    } catch (error) {
      console.error('Error adding project to IndexedDB:', error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    const projectToDelete = projects.find((project) => project.id === id);
    if (!projectToDelete) return;

    if (onDeleteProject) {
      await onDeleteProject(projectToDelete);
      return;
    }

    try {
      await db.transaction('rw', db.projects, db.todos, async () => {
        await db.projects.delete(id);
        await db.todos.where('project_id').equals(id).delete();
      });

      if (selectedProjectId === id) {
        onSelectProject(null);
      }
    } catch (error) {
      console.error('Error deleting project from IndexedDB:', error);
    }
  };

  return (
    <div className="w-64 border-r border-gray-200 h-screen flex flex-col bg-white">
      <div className="p-6 border-b border-gray-200">
        <h2
          className="text-2xl font-semibold mb-4 cursor-pointer hover:text-gray-600 transition-colors"
          onClick={() => onSelectProject(null)}
        >
          Proyectos
        </h2>

        <button
          onClick={() => void handleCreateProject()}
          className="w-full text-left px-4 py-2 text-gray-600 hover:text-black hover:bg-gray-50 rounded transition-colors text-lg"
        >
          + Nuevo proyecto
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {projects.length === 0 ? (
            <p className="text-gray-400 text-lg px-4 py-2">No hay proyectos aún</p>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="group flex items-center gap-2">
                <button
                  onClick={() => onSelectProject(project.id)}
                  className={`flex-1 text-left px-4 py-2 rounded transition-colors text-lg ${
                    selectedProjectId === project.id
                      ? 'bg-gray-100 text-black font-medium'
                      : 'text-gray-600 hover:text-black hover:bg-gray-50'
                  }`}
                >
                  {project.name}
                </button>
                <button
                  onClick={() => void handleDeleteProject(project.id)}
                  className="opacity-60 hover:opacity-100 text-gray-400 hover:text-black transition-opacity text-xl leading-none px-2"
                  aria-label="Eliminar proyecto"
                  title="Eliminar proyecto"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export type { Project };
