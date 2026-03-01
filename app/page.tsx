'use client';

import { useEffect, useState } from 'react';
import CustomCheckbox from '@/components/CustomCheckbox';
import Sidebar from '@/components/Sidebar';
import UndoNotification from '@/components/UndoNotification';
import { db, migrateLegacyLocalStorageToDexie, type Project, type Todo } from '@/lib/db';

interface UndoState {
  type: 'todo' | 'project' | null;
  item: Todo | Project | null;
  projectTodos?: Todo[];
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoState>({ type: null, item: null });
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState('');

  const refreshProjects = async () => {
    try {
      const projectsData = await db.projects.orderBy('created_at').reverse().toArray();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching projects from IndexedDB:', error);
    }
  };

  const refreshTodos = async (projectId: string | null = selectedProjectId) => {
    try {
      const allTodos = await db.todos.orderBy('created_at').reverse().toArray();
      const filteredTodos = projectId
        ? allTodos.filter((todo) => todo.project_id === projectId)
        : allTodos;
      setTodos(filteredTodos);
    } catch (error) {
      console.error('Error fetching todos from IndexedDB:', error);
    }
  };

  useEffect(() => {
    let isActive = true;

    const initializeData = async () => {
      setLoading(true);
      try {
        await migrateLegacyLocalStorageToDexie();

        const [projectsData, todosData] = await Promise.all([
          db.projects.orderBy('created_at').reverse().toArray(),
          db.todos.orderBy('created_at').reverse().toArray(),
        ]);

        if (!isActive) return;

        setProjects(projectsData);
        setTodos(todosData);
      } catch (error) {
        console.error('Error initializing IndexedDB data:', error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void initializeData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    void refreshTodos(selectedProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: trimmedInput,
      completed: false,
      project_id: selectedProjectId,
      created_at: new Date().toISOString(),
    };

    const shouldShowInCurrentView = selectedProjectId === null || selectedProjectId === newTodo.project_id;

    if (shouldShowInCurrentView) {
      setTodos((prev) => [newTodo, ...prev]);
    }

    setInputValue('');

    try {
      await db.todos.put(newTodo);
    } catch (error) {
      console.error('Error adding todo to IndexedDB:', error);
      await refreshTodos();
    }
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              completed: !todo.completed,
            }
          : todo,
      ),
    );

    try {
      await db.todos.update(id, { completed: !completed });
    } catch (error) {
      console.error('Error updating todo in IndexedDB:', error);
      await refreshTodos();
    }
  };

  const deleteTodo = async (id: string) => {
    let todoToDelete = todos.find((todo) => todo.id === id);

    if (!todoToDelete) {
      try {
        todoToDelete = await db.todos.get(id);
      } catch (error) {
        console.error('Error loading todo before delete:', error);
      }
    }

    if (!todoToDelete) return;

    setTodos((prev) => prev.filter((todo) => todo.id !== id));
    setUndoState({ type: 'todo', item: todoToDelete });

    try {
      await db.todos.delete(id);
    } catch (error) {
      console.error('Error deleting todo from IndexedDB:', error);
      await refreshTodos();
    }
  };

  const handleUndoTodo = async (todo: Todo) => {
    try {
      await db.todos.put(todo);
      await refreshTodos();
    } catch (error) {
      console.error('Error restoring todo in IndexedDB:', error);
    } finally {
      setUndoState({ type: null, item: null });
    }
  };

  const handleUndoProject = async (project: Project, projectTodos?: Todo[]) => {
    try {
      await db.transaction('rw', db.projects, db.todos, async () => {
        await db.projects.put(project);

        if (projectTodos && projectTodos.length > 0) {
          const todosToRestore = projectTodos.map((todo) => ({
            ...todo,
            project_id: project.id,
          }));
          await db.todos.bulkPut(todosToRestore);
        }
      });

      await Promise.all([refreshProjects(), refreshTodos()]);
    } catch (error) {
      console.error('Error restoring project in IndexedDB:', error);
    } finally {
      setUndoState({ type: null, item: null });
    }
  };

  const handleUndo = () => {
    if (undoState.type === 'todo' && undoState.item) {
      void handleUndoTodo(undoState.item as Todo);
      return;
    }

    if (undoState.type === 'project' && undoState.item) {
      void handleUndoProject(undoState.item as Project, undoState.projectTodos);
    }
  };

  const handleDismissUndo = () => {
    setUndoState({ type: null, item: null });
  };

  const handleRenameProject = async (projectId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, name: trimmed } : p)),
    );

    try {
      await db.projects.update(projectId, { name: trimmed });
    } catch (error) {
      console.error('Error renaming project in IndexedDB:', error);
      await refreshProjects();
    }
  };

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onProjectCreated={(project) => {
          setProjects((prev) => [project, ...prev.filter((existing) => existing.id !== project.id)]);
          setProjectNameDraft(project.name);
          setEditingProjectName(true);
        }}
        onDeleteProject={async (project) => {
          let projectTodos: Todo[] = [];

          try {
            projectTodos = await db.todos.where('project_id').equals(project.id).toArray();
          } catch (error) {
            console.error('Error loading project todos before delete:', error);
          }

          setProjects((prev) => prev.filter((existing) => existing.id !== project.id));
          setTodos((prev) => prev.filter((todo) => todo.project_id !== project.id));

          const projectWasSelected = selectedProjectId === project.id;
          if (projectWasSelected) {
            setSelectedProjectId(null);
          }

          setUndoState({
            type: 'project',
            item: project,
            projectTodos,
          });

          try {
            await db.transaction('rw', db.projects, db.todos, async () => {
              await db.projects.delete(project.id);
              await db.todos.where('project_id').equals(project.id).delete();
            });
          } catch (error) {
            console.error('Error deleting project from IndexedDB:', error);
            await Promise.all([
              refreshProjects(),
              refreshTodos(projectWasSelected ? null : selectedProjectId),
            ]);
          }
        }}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-16">
          {selectedProject && (
            editingProjectName ? (
              <input
                type="text"
                value={projectNameDraft}
                onChange={(e) => setProjectNameDraft(e.target.value)}
                onBlur={() => {
                  const trimmed = projectNameDraft.trim();
                  setEditingProjectName(false);
                  if (trimmed && trimmed !== selectedProject.name) {
                    void handleRenameProject(selectedProject.id, trimmed);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                  if (e.key === 'Escape') {
                    setEditingProjectName(false);
                  }
                }}
                onFocus={(e) => e.target.select()}
                className="text-3xl font-bold text-black bg-transparent border-none outline-none focus:outline-none w-full mb-6"
                autoFocus
              />
            ) : (
              <h1
                className="text-3xl font-bold text-black mb-6 cursor-pointer hover:text-gray-700 transition-colors"
                onClick={() => {
                  setProjectNameDraft(selectedProject.name);
                  setEditingProjectName(true);
                }}
              >
                {selectedProject.name}
              </h1>
            )
          )}

          <form onSubmit={handleSubmit} className="mb-12">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe una tarea y presiona Enter"
              className="w-full text-2xl font-normal text-black placeholder:text-gray-400 bg-transparent border-none outline-none focus:outline-none"
              autoFocus
            />
          </form>

          {loading ? (
            <p className="text-gray-400 text-xl">Cargando...</p>
          ) : selectedProjectId ? (
            <div className="space-y-2">
              {todos.length === 0 ? (
                <p className="text-gray-400 text-xl">No hay tareas aún</p>
              ) : (
                todos.map((todo) => (
                  <div key={todo.id} className="flex items-start gap-4 group text-xl todo-item">
                    <CustomCheckbox
                      checked={todo.completed}
                      onChange={() => void toggleComplete(todo.id, todo.completed)}
                    />
                    <span
                      className={`flex-1 leading-relaxed todo-text ${
                        todo.completed ? 'completed' : ''
                      }`}
                    >
                      {todo.text}
                    </span>
                    <button
                      onClick={() => void deleteTodo(todo.id)}
                      className="opacity-60 hover:opacity-100 text-gray-400 hover:text-black transition-opacity text-2xl leading-none mt-0.5 delete-btn"
                      aria-label="Eliminar tarea"
                      title="Eliminar tarea"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {projects.length === 0 && todos.filter((todo) => !todo.project_id).length === 0 ? (
                <p className="text-gray-400 text-xl">No hay tareas aún</p>
              ) : (
                <>
                  {projects.map((project) => {
                    const projectTodos = todos.filter((todo) => todo.project_id === project.id);
                    if (projectTodos.length === 0) return null;

                    return (
                      <div key={project.id} className="space-y-3">
                        <h2 className="text-2xl font-semibold text-black">{project.name}</h2>
                        <div className="space-y-2 pl-2">
                          {projectTodos.map((todo) => (
                            <div key={todo.id} className="flex items-start gap-4 group text-xl todo-item">
                              <CustomCheckbox
                                checked={todo.completed}
                                onChange={() => void toggleComplete(todo.id, todo.completed)}
                              />
                              <span
                                className={`flex-1 leading-relaxed todo-text ${
                                  todo.completed ? 'completed' : ''
                                }`}
                              >
                                {todo.text}
                              </span>
                              <button
                                onClick={() => void deleteTodo(todo.id)}
                                className="opacity-60 hover:opacity-100 text-gray-400 hover:text-black transition-opacity text-2xl leading-none mt-0.5 delete-btn"
                                aria-label="Eliminar tarea"
                                title="Eliminar tarea"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {todos.filter((todo) => !todo.project_id).length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-2xl font-semibold text-black">Sin proyecto</h2>
                      <div className="space-y-2 pl-2">
                        {todos
                          .filter((todo) => !todo.project_id)
                          .map((todo) => (
                            <div key={todo.id} className="flex items-start gap-4 group text-xl todo-item">
                              <CustomCheckbox
                                checked={todo.completed}
                                onChange={() => void toggleComplete(todo.id, todo.completed)}
                              />
                              <span
                                className={`flex-1 leading-relaxed todo-text ${
                                  todo.completed ? 'completed' : ''
                                }`}
                              >
                                {todo.text}
                              </span>
                              <button
                                onClick={() => void deleteTodo(todo.id)}
                                className="opacity-60 hover:opacity-100 text-gray-400 hover:text-black transition-opacity text-2xl leading-none mt-0.5 delete-btn"
                                aria-label="Eliminar tarea"
                                title="Eliminar tarea"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {undoState.type && undoState.item && (
        <UndoNotification
          message={`${undoState.type === 'todo' ? 'Tarea' : 'Proyecto'} eliminado`}
          onUndo={handleUndo}
          onDismiss={handleDismissUndo}
        />
      )}
    </div>
  );
}
