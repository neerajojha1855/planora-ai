# Copilot instructions

## Repository shape

This repository is split into two independent parts:

- `frontend/` is the implemented application: a Vite + React 19 + TypeScript single-page app. The browser entry point is `src/main.tsx`, which mounts `src/App.tsx`; global styles are in `src/index.css` and app styles are in `src/App.css`.
- `backend/` is currently a scaffold only. It contains an `app/` package, Alembic layout, pytest configuration, and a virtual environment, but the Python source, dependency manifest, migration configuration, and test configuration are empty. Do not assume that backend endpoints, database models, migrations, or test commands exist until they are implemented.

The root `OVERVIEW.md` describes the intended product: a GenAI event-planning assistant for weddings, birthdays, and community events, with budgets, timelines, vendor checklists, and personalized ideas. The root `README.md` is empty. The frontend README is the unmodified Vite template and is not a project-specific source of requirements.

## Commands

Run frontend commands from `frontend/`:

```powershell
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

- `npm run build` runs TypeScript project compilation (`tsc -b`) followed by the Vite production build.
- `npm run lint` runs ESLint over the frontend project.
- There is currently no frontend test script or test runner, so a single frontend test cannot be run yet.
- There are currently no usable backend install, run, migration, or test commands because `backend/requirements.txt`, `backend/pytest.ini`, `backend/alembic.ini`, and the Python source files are empty. Add and document those commands when backend implementation begins.

## Frontend conventions

- Keep application code under `frontend/src`; static files that need public URLs belong in `frontend/public`.
- Use the existing Vite React entry pattern: `src/main.tsx` mounts the root element and imports `App` plus the global stylesheet.
- Keep component-specific styling in `App.css` and global/document styling in `index.css`, unless a new styling system is deliberately introduced.
- TypeScript is configured in bundler mode with `noEmit`, strict unused-local and unused-parameter checks, `noFallthroughCasesInSwitch`, and `erasableSyntaxOnly`. New code must satisfy both `npm run lint` and `npm run build`.
- ESLint applies the recommended JavaScript, TypeScript, React Hooks, and React Refresh configurations to `*.ts` and `*.tsx` files. Preserve the existing flat config in `eslint.config.js` when adding rules.
- Existing asset imports use relative imports from `src/assets`; public SVG sprites are referenced by root-relative URLs such as `/icons.svg#...`.
- The current UI is still starter content. When implementing the event-planning product, replace the starter screen rather than extending its counter/demo behavior as application architecture.

## Working across the two parts

- Treat frontend and backend as separate toolchains and run commands from the matching subdirectory.
- There is no configured frontend-to-backend API contract yet. If adding one, define the backend routes and request/response shapes explicitly, then centralize frontend calls rather than scattering ad hoc URLs through components.
- Do not add backend-specific instructions, environment variables, database assumptions, or migration steps to code until the currently empty backend scaffold is populated and its configuration is checked in.
