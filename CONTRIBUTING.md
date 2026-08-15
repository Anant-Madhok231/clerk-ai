# Contributing

Clerk is a small monorepo. The pieces:

- `packages/core` - domain types and the deterministic situation-matching logic. No Electron or Node-only dependencies.
- `packages/agent` - the AI provider abstraction, structured-output schema, and the LangGraph pipeline that ties classification and matching together.
- `apps/desktop` - the Electron + React application: main process (SQLite, Gmail/Calendar integrations, IPC), preload bridge, and renderer.
- `apps/site` - the static GitHub Pages site with the interactive demo.

## Setup

```bash
git clone https://github.com/Anant-Madhok231/clerk-ai.git
cd clerk-ai
npm install
npm run build:core
npm run build:agent
npm run dev
```

`npm run dev` launches the Electron app in development mode with hot reload for the renderer. Demo Mode works out of the box with no configuration.

To work on Gmail/Calendar integration, copy `.env.example` and fill in a Google OAuth "Desktop app" client (see the README's Gmail OAuth section).

## Before opening a PR

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run smoke-test
```

CI runs the same commands. `npm run smoke-test` boots the packaged Electron main process headlessly and verifies the Demo Mode pipeline end to end (SQLite init, situation matching, dashboard aggregation) - it catches issues a TypeScript build alone won't, like a native module built against the wrong Electron ABI.

## Code style

- Prefer names tied to the domain (`gmailSync.ts`, `situationRepo.ts`) over generic ones (`utils.ts`, `helpers.ts`).
- Comments should explain *why*, not restate the code. Skip comments on anything that's already obvious from the function name and body.
- Keep functions scoped to one job. Don't add abstraction layers "for future flexibility" unless there's a concrete second use case today.

## Commit messages

Conventional-ish and specific: `feat: add situation persistence`, `fix: dedupe gmail messages by content hash`, `test: cover ambiguous deadline extraction`. Avoid vague messages like "updates" or "wip".
