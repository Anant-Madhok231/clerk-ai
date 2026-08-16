# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.0.3] — 2026-08-16

New situation-management features on top of the existing pipeline — no changes to classification, matching, or reconciliation logic.

### Added

- **Not needed / Spam**: dismiss any situation directly from its card or the detail view. Two separate actions — plain "Dismiss" only hides that one item, "Dismiss + Hide Similar" also remembers the sender/subject wording so future mail that looks similar gets auto-filed the same way. Nothing is ever deleted.
- **Low section**: a new nav item holding everything dismissed, split into two sub-sections — Low-Rate (dismissed by hand) and Low-Like (auto-matched to something dismissed with "hide similar" on). Fully recoverable with a restore action.
- **Important**: a star toggle on every card and the detail view. Marking something important is a pure flag — it doesn't move or change the item at all, so a WAITING situation marked important still shows in Waiting exactly as before, and now also shows in a new Important nav section.
- Website's beta-access download form (added earlier) — its version string now tracks the desktop app's own version.

## [1.0.2] — 2026-08-16

Release-provenance correction, plus a batch of real fixes that had accumulated on `main` after `v1.0.1` was tagged and published. `v1.0.1`'s published assets were rebuilt from later commits without moving the tag, so the tag no longer matched what it shipped — `v1.0.2` is a clean tag/build/asset match at the current source. `v1.0.1` itself is left published and untouched; nothing about it was rewritten.

### Fixed (since v1.0.1's tagged commit)

- Google OAuth token exchange now sends `client_secret` — required by Google for "Desktop app" client types even with PKCE, discovered via a live 401.
- Google access tokens are refreshed automatically before they expire (Gmail and Calendar), instead of failing after ~1 hour.
- Gmail sync fetches full message bodies (`format=full`) instead of only the ~150-character snippet, both for classification and for on-screen summaries.
- Gmail queries now exclude `-in:sent -in:drafts`, so a user's own reply on a thread is never ingested as a new incoming item.
- New Gmail connections (and pre-existing installs on first launch after upgrading) run a paginated 10-day backfill, so mail already in the inbox before Clerk was connected gets analyzed instead of silently skipped.
- `DemoAIProvider` recognizes sentence-initial imperative language ("Open your dashboard...", "Confirm your spot...") and common personal-correspondence signal phrases, not just its original fixed phrase list — fixes real missed items found via live testing against a connected account.
- Deadlines without an explicit year are now resolved against the message's received date instead of being dropped.
- Zero-width/invisible Unicode characters are stripped from both extracted body text and Gmail's own snippet field (two separate code paths were affected).

### Added (since v1.0.1's tagged commit)

- Tracked Senders: track an exact email address or a whole domain; matched mail gets a priority boost. Domain matching is real suffix matching, not substring (`fakecompany.com` does not match `company.com`).
- Deadline countdown display ("3 days left" / "Due tomorrow" / "Overdue by N days") on situation cards and the detail view.
- "Mark Complete" quick action directly on situation cards.
- Upcoming Calendar events shown on Home.
- "Check Inbox Now" button in Settings (the IPC path already existed, no UI entry point previously).
- Privacy policy page, required for Google OAuth verification.

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
- Windows packaging (NSIS) — builds successfully via GitHub Actions on a real `windows-latest` runner (`release.yml`'s `build-windows` job); installer has not been run/installed on an actual Windows machine.
- Replacement GitHub Pages site with an interactive static demo, published at https://anant-madhok231.github.io/clerk-ai/ — includes explicit per-platform download buttons (Mac Apple Silicon, Mac Intel, Windows) linking to stable `releases/latest/download/...` URLs that don't need updating on future releases.
- 71 automated tests (37 plain, 34 exercising SQLite).

### Known limitations

- Live Gmail/Calendar sync is implemented and unit-tested against mocks but not verified against a real Google account — no OAuth client credentials are configured in this environment.
- `OpenAIProvider` is implemented and structurally sound but not exercised against the live OpenAI API — no API key configured here.
- macOS builds are unsigned/non-notarized (no Apple Developer identity available).
- Windows installer builds successfully in CI but has not been installed, launched, or uninstalled on a real Windows machine — no Windows machine is available in this environment.
