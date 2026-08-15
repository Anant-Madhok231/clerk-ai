# Clerk

Your personal AI admin agent.

Clerk monitors emails and documents, identifies what actually needs your attention, tracks unresolved situations, and recognizes when they're completed. It's a desktop app - Gmail and documents in, a short list of things you need to do, are waiting on, or have resolved, out.

[Download for macOS](https://github.com/Anant-Madhok231/clerk-ai/releases) · [Download for Windows](https://github.com/Anant-Madhok231/clerk-ai/releases) · [Try the demo](https://Anant-Madhok231.github.io/clerk-ai/) · [View Source](https://github.com/Anant-Madhok231/clerk-ai)

## What it does

Most of what lands in an inbox doesn't need action - newsletters, receipts, marketing. Clerk reads what comes in and sorts it into four states:

- **Action** - you need to do something (pay a bill, sign a form, confirm an appointment), with a deadline and amount extracted when present.
- **Waiting** - you've already acted and are waiting on someone else (a refund, a landlord, an application response).
- **Completed** - a Waiting or Action situation got resolved, detected from a follow-up message rather than treated as a new, unrelated item.
- **Informational** - no action needed, kept out of the way.

A refund-request confirmation and the "your refund has been processed" email that arrives four days later become one situation, not two - Clerk matches the second email to the first via the Gmail thread, the order number, and the sender, then flips its status from Waiting to Completed and records why in its timeline.

## How it works

```
Email / Document
       |
       v
     Clerk
       |
   +---+---+---+
   |   |   |   |
Action Waiting Completed Informational
```

Every email or document that comes in runs through the same pipeline: deterministic matching against open situations first (thread ID, reference numbers, sender, wording overlap - all free, all explainable), then a single classification pass (Demo Mode's rule-based extractor, or a real model via OpenAI) that fills in the structured fields and decides whether this is a new situation, an update to an existing one, or a resolution. Nothing gets saved without passing a Zod schema. See `docs/architecture.md` for the full breakdown, including why this is a LangGraph state machine rather than a plain function.

## Features

- One Clerk agent with a focused toolset - not a chatbot, not a multi-agent demo.
- Gmail integration: read-only access, a bounded 30-day initial scan, and incremental sync via Gmail history IDs with a bounded resync fallback if history expires.
- Google Calendar integration: Clerk suggests adding a deadline to your calendar and shows a confirmation dialog first - it never creates events on its own.
- Document import for PDF, PNG, JPG, and TXT files, with local PDF text extraction and content-hash deduplication.
- Every situation stays traceable to its source - the original email or file is one click away.
- Confidence-aware extraction: a deadline found with `>= 0.85` confidence is shown as fact; below that, Clerk asks you to confirm it rather than presenting a guess as certain.
- Native desktop notifications and a system tray icon with background monitoring you can pause.
- OS-protected secret storage (Keychain / DPAPI / libsecret via Electron's `safeStorage`) for OAuth tokens and API keys - never `localStorage`, never committed, never logged.
- A fully offline Demo Mode with realistic seeded data, so you can evaluate Clerk without connecting a real account.

## Screenshots

The fastest way to see the UI is the [interactive demo](https://Anant-Madhok231.github.io/clerk-ai/#demo) - it's the same Home / Actions / Waiting / detail-view flow as the desktop app, running against sample data, no install required.

## Development setup

Requires Node 20+.

```bash
git clone https://github.com/Anant-Madhok231/clerk-ai.git
cd clerk-ai
npm install
npm run build:core
npm run build:agent
npm run dev
```

`npm run dev` launches the Electron app with the renderer in hot-reload mode. Demo Mode works immediately with no configuration - onboarding will offer "Try Demo" if you skip connecting Gmail.

```bash
npm run lint         # eslint across the monorepo
npm run typecheck    # tsc --noEmit for every package/app
npm test             # vitest - core matching logic + the full agent pipeline
npm run build         # builds packages/core, packages/agent, apps/desktop, apps/site
npm run smoke-test    # boots the packaged Electron main process headlessly and
                       # verifies the Demo Mode pipeline end to end
```

### Building installers

```bash
npm run dist:mac    # requires macOS
npm run dist:win    # requires Windows, or cross-build via Wine on Linux/macOS
```

Unsigned builds still produce installable `.dmg` / `.exe` files - see `docs/release.md` for what that means for Gatekeeper/SmartScreen, and how to wire up real signing once certificates are available.

## Gmail OAuth setup

Gmail and Calendar integration need a Google Cloud OAuth client. Without one, Clerk still works fully in Demo Mode - the onboarding flow and Settings screen both explain this rather than pretending the buttons don't exist.

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com/).
2. Enable the **Gmail API** and **Google Calendar API**.
3. Create an OAuth client under APIs & Services → Credentials, application type **Desktop app**.
4. While the app is in "Testing" publishing status, add your own Google account as a test user.
5. Copy `.env.example` to `.env` (or export the variables in your shell) and fill in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

Clerk requests `gmail.readonly` only - it can't delete mail, send mail, or modify labels, by design.

## AI provider configuration

Clerk ships with a fully offline **Demo Mode**: deterministic rule-based extraction, no API key, no network call, and it's what the automated test suite exercises. To use a real model instead, open Settings → AI in the app and paste an OpenAI API key - it's encrypted with `safeStorage` and stored locally, never as a plain environment variable the renderer could read. The `AIProvider` interface (`packages/agent/src/provider.ts`) is the seam a future hosted "Clerk Cloud" provider would implement without changing anything else in the app.

## Privacy

- All application data - situations, sources, settings - lives in a local SQLite database under your OS's per-user application-data directory. Nothing is synced to a Clerk-operated server; there isn't one.
- Gmail access is read-only. Calendar events are created only after an explicit confirmation dialog.
- Only the content needed to classify one message is sent to your chosen AI provider - not your inbox, not your history.
- Settings → Privacy has one-click "Disconnect Gmail," "Disconnect Calendar," and "Delete Clerk Data" actions, all with a confirmation step before anything destructive happens.

See `SECURITY.md` for more detail and how to report a vulnerability.

## Testing

`packages/core` and `packages/agent` have unit tests covering the cases the product spec calls out directly: action extraction with amount/deadline, waiting-state detection, a Waiting → Completed resolution via reference-code + merchant matching (without creating a duplicate situation), informational classification, and refusing to fabricate a precise deadline from vague language ("sometime next week"). Run them with `npm test`.

`npm run smoke-test` covers the integration seam unit tests can't: it launches the actual packaged Electron main process, seeds Demo Mode through the real SQLite + agent pipeline, and checks the resulting dashboard shape - which is what catches issues like a native module built against the wrong Electron ABI.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for process boundaries, why the pipeline is a LangGraph state machine, and the reasoning behind the provider abstraction. See [`docs/release.md`](docs/release.md) for the release process and code-signing setup.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT - see [`LICENSE`](LICENSE).
