# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.0.1] — 2026-08-15

Clean rebuild of Clerk. Versioned 1.0.1 rather than 1.0.0 because the existing `Anant-Madhok231/clerk-ai` repository already had a `v1.0.0` tag from the prior implementation, preserved untouched at the `legacy-before-clean-rebuild` tag and `legacy-cowork-build` branch.

### Added

- Electron + React + TypeScript desktop app with a secure IPC boundary (`contextIsolation`, `sandbox`, narrow `contextBridge` API, Zod-validated payloads).
- SQLite persistence via Drizzle ORM (`source_item`, `situation`, `situation_source`, `situation_event`, `settings`), with automatic migrations.
- Situation status state machine (`ACTION` / `WAITING` / `COMPLETED` / `INFORMATIONAL`) and deterministic thread-based matching.
- `processSourceItem` — the single ingestion → match → classify → reconcile → persist pipeline shared by Demo Mode, Gmail sync, and document import.
- `DemoAIProvider` (deterministic, no credentials) and `OpenAIProvider` (structured JSON output, Zod-validated, bounded retries).
- Demo Mode: seeded fixtures run through the real pipeline, including a genuine WAITING → COMPLETED reconciliation.
- Gmail integration: PKCE OAuth (desktop flow, no client secret), encrypted token storage, bounded initial sync (last 30 days, capped message count), manual "Check Inbox Now."
- Google Calendar integration: write-gated event creation with an explicit confirmation dialog, duplicate prevention via a stored event ID.
- Document import: PDF (via pdf.js) and TXT text extraction, drag-and-drop and native file picker, routed through the same ingestion pipeline.
- Full desktop UI: onboarding, Home, Actions, Waiting, Documents, History, Situation Detail (with timeline and source traceability), Settings.
- Live UI sync: main-process push events (`clerk:situationsChanged`, `clerk:syncStatusChanged`) invalidate TanStack Query caches — no polling, no manual reload.
- System tray (Open Clerk / Check Inbox Now / Pause Monitoring / Settings / Quit Clerk), native notifications, and a background sync scheduler.
- Original Clerk app icon and branding, generated into every required platform format (`.icns`, `.ico`, tray template, favicon).
- macOS packaging via electron-builder — built and verified locally (mounted, launched, confirmed via automated inspection).
- Windows packaging configuration (NSIS) — prepared, not locally verified (no Windows machine in this environment).
- Replacement GitHub Pages site with an interactive static demo — built locally, not deployed.
- 71 automated tests (37 plain, 34 exercising SQLite).

### Known limitations

- Live Gmail/Calendar sync is implemented and unit-tested against mocks but not verified against a real Google account — no OAuth client credentials are configured in this environment.
- `OpenAIProvider` is implemented and structurally sound but not exercised against the live OpenAI API — no API key configured here.
- macOS builds are unsigned/non-notarized (no Apple Developer identity available).
- Windows build is configured but untested locally.
