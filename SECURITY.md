# Security Policy

## Reporting a vulnerability

If you find a security issue in Clerk, please email anantmadhok88@gmail.com rather than opening a public issue. Include what you found, how to reproduce it, and its impact if you can. This is a personal project without a formal disclosure SLA, but reports will be acknowledged and addressed as a priority.

## What Clerk does and doesn't do

- **Local-first.** Situations, sources, and settings live in a SQLite database in your OS's per-user application data directory. Nothing is sent to a server Clerk's authors control.
- **Credentials never touch the renderer.** Gmail/Calendar OAuth tokens and the OpenAI API key are stored via Electron's `safeStorage` (OS keychain-backed encryption), read only by the main process, and never exposed to the renderer or logged.
- **No `keytar` or other native credential store** unless a concrete, reproducible `safeStorage` limitation requires it — not added preemptively.
- **Renderer sandboxing:** every window runs with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. The renderer's only access to the outside world is a narrow, typed `window.clerk.*` API exposed via `contextBridge` — no raw `ipcRenderer`, `fs`, `child_process`, or `process.env`.
- **IPC validation:** every payload crossing the preload boundary is validated with Zod in the main process before it's used.
- **Gmail access is read-only** (`gmail.readonly` scope). Clerk never sends, deletes, or modifies email.
- **Calendar writes require explicit confirmation.** Clerk never creates a calendar event without the user confirming a preview dialog first.
- **No autonomous financial or legal actions.** Clerk never sends money, makes purchases, accepts contracts, or submits forms on the user's behalf.
- **Imported files are never executed.** Document text extraction (PDF/TXT) happens locally and is treated as untrusted content.

## Known limitations at this stage

- Builds produced by `npm run dist:mac` are unsigned and not notarized — there's no Apple Developer identity configured in this environment. `apps/desktop/electron-builder.yml` is set up for eventual signing/notarization once credentials are available.
- Windows builds are configured but not verified locally (no Windows machine available); verification is expected to happen via CI on a `windows-latest` runner.
