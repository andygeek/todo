# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI-Generated Project

This project is 100% created and maintained by AI. Every commit **must** include a `Co-Authored-By` trailer identifying the AI model that made the change. This is a mandatory rule, not optional.

Format:
```
Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

Example:
```
feat: add dark mode support

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server at localhost:9999
pnpm build            # Production build
pnpm lint             # ESLint (flat config, core-web-vitals + typescript)
pnpm start            # Production server at localhost:9999
```

Port defaults to 9999 (configurable via `PORT` env var).

## Architecture

Local-first todo app — **no backend**. All data lives in the browser's IndexedDB via Dexie.

- **Next.js 16** (App Router) + React 19 + TypeScript + Tailwind CSS v4
- Single `"use client"` page (`app/page.tsx`) — the entire app is client-rendered
- `lib/db.ts` — Dexie database schema (`TodoDatabase`), types (`Project`, `Todo`), and a one-time idempotent migration from localStorage to IndexedDB
- `@/*` path alias maps to project root (configured in `tsconfig.json`)

### Data model

- **Project**: `id`, `name`, `created_at`
- **Todo**: `id`, `text`, `completed`, `project_id` (nullable FK to Project), `created_at`
- IDs are `crypto.randomUUID()` strings

### Key patterns

- Optimistic UI updates: state is updated immediately, then persisted to IndexedDB; on error, state is refreshed from DB
- Undo for deletions: deleted items are held in `undoState` and can be restored (including cascade-restoring a project's todos)
- UI language is Spanish (labels, placeholders)
- Font: EB Garamond (Google Fonts, loaded in `layout.tsx`)
