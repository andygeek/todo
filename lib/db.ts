import Dexie, { type Table } from 'dexie';

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  project_id: string | null;
  created_at: string;
}

interface MetaEntry {
  key: string;
  value: string;
}

class TodoDatabase extends Dexie {
  projects!: Table<Project, string>;
  todos!: Table<Todo, string>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super('todo-db');

    this.version(1).stores({
      projects: 'id, name, created_at',
      todos: 'id, project_id, completed, created_at',
      meta: 'key',
    });
  }
}

export const db = new TodoDatabase();

const LEGACY_TODOS_STORAGE_KEY = 'todos-app';
const LEGACY_PROJECTS_STORAGE_KEY = 'projects-app';
const LEGACY_MIGRATION_META_KEY = 'legacy_localstorage_migrated_v1';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeProject = (item: unknown): Project | null => {
  if (!isRecord(item)) return null;

  const id = typeof item.id === 'string' && item.id.trim() ? item.id : crypto.randomUUID();
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const createdAt =
    typeof item.created_at === 'string' && item.created_at.trim()
      ? item.created_at
      : new Date().toISOString();

  if (!name) return null;

  return {
    id,
    name,
    created_at: createdAt,
  };
};

const normalizeTodo = (item: unknown): Todo | null => {
  if (!isRecord(item)) return null;

  const id = typeof item.id === 'string' && item.id.trim() ? item.id : crypto.randomUUID();
  const text = typeof item.text === 'string' ? item.text.trim() : '';
  const completed = Boolean(item.completed);
  const createdAt =
    typeof item.created_at === 'string' && item.created_at.trim()
      ? item.created_at
      : new Date().toISOString();

  let projectId: string | null = null;
  if (typeof item.project_id === 'string' && item.project_id.trim()) {
    projectId = item.project_id;
  }

  if (!text) return null;

  return {
    id,
    text,
    completed,
    project_id: projectId,
    created_at: createdAt,
  };
};

const readLegacyArray = <T>(storageKey: string, normalizer: (item: unknown) => T | null): T[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizer(item))
      .filter((item): item is T => item !== null);
  } catch (error) {
    console.error(`Error reading legacy localStorage key \"${storageKey}\":`, error);
    return [];
  }
};

export const migrateLegacyLocalStorageToDexie = async (): Promise<void> => {
  if (typeof window === 'undefined') return;

  const alreadyMigrated = await db.meta.get(LEGACY_MIGRATION_META_KEY);
  if (alreadyMigrated?.value === 'true') return;

  const [existingProjectCount, existingTodoCount] = await Promise.all([
    db.projects.count(),
    db.todos.count(),
  ]);

  if (existingProjectCount > 0 || existingTodoCount > 0) {
    await db.meta.put({ key: LEGACY_MIGRATION_META_KEY, value: 'true' });
    return;
  }

  const legacyProjects = readLegacyArray<Project>(LEGACY_PROJECTS_STORAGE_KEY, normalizeProject);
  const legacyTodos = readLegacyArray<Todo>(LEGACY_TODOS_STORAGE_KEY, normalizeTodo);

  if (legacyProjects.length === 0 && legacyTodos.length === 0) {
    await db.meta.put({ key: LEGACY_MIGRATION_META_KEY, value: 'true' });
    return;
  }

  const validProjectIds = new Set(legacyProjects.map((project) => project.id));
  const todosWithValidProjectIds = legacyTodos.map((todo) => {
    if (todo.project_id && !validProjectIds.has(todo.project_id)) {
      return { ...todo, project_id: null };
    }
    return todo;
  });

  await db.transaction('rw', db.projects, db.todos, db.meta, async () => {
    if (legacyProjects.length > 0) {
      await db.projects.bulkPut(legacyProjects);
    }

    if (todosWithValidProjectIds.length > 0) {
      await db.todos.bulkPut(todosWithValidProjectIds);
    }

    await db.meta.put({ key: LEGACY_MIGRATION_META_KEY, value: 'true' });
  });
};
