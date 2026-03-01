# Todo App

> **This project was 100% created using AI** (Claude Code by Anthropic).

**Live demo:** [andygeek-todo.vercel.app](https://andygeek-todo.vercel.app)

Local-first task manager. All data is stored in the browser using IndexedDB, no server or account required.

## Stack

- **Next.js** (App Router) + React 19 + TypeScript
- **Tailwind CSS** for styling
- **Dexie** as a typed wrapper over IndexedDB
- **pnpm** as package manager

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:9999](http://localhost:9999).

## Project structure

```
app/
  page.tsx            # Main view (tasks and projects)
  layout.tsx          # Global layout
components/
  Sidebar.tsx         # Project sidebar
  CustomCheckbox.tsx
  UndoNotification.tsx
lib/
  db.ts               # Dexie schema and localStorage migration
```

## Features

- Create, complete and delete tasks
- Organize tasks by project
- Inline editable project names (click to rename)
- Undo task and project deletion
- Global view with all projects or individual project view
- 100% local data in the browser (IndexedDB)

## Storage

Data lives in IndexedDB inside the browser, tied to the origin (`localhost:9999` in development). There is no backend. If you change the port or clear site data, the data is lost.

On first launch, an automatic migration runs from `localStorage` (keys `projects-app` and `todos-app`) to IndexedDB. The migration is idempotent.
