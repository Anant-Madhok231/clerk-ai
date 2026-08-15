# Security

Clerk is a local-first desktop application. A few things worth knowing:

- OAuth tokens (Gmail, Calendar) and any AI API key you provide are encrypted with the OS keychain (`safeStorage` on macOS/Windows/Linux) and stored under your local user-data directory. They are never written to `localStorage`, never logged, and never committed to this repository.
- All application data (situations, sources, settings) lives in a local SQLite database on your machine. Nothing is synced to a Clerk-operated server - there isn't one in V1.
- The renderer process runs with `contextIsolation: true`, `nodeIntegration: false`, and a sandboxed, narrow preload bridge. It has no direct filesystem, network, or Node.js access.
- External links (Gmail, GitHub, the website) always open in your default browser, never inside the app shell.

## Reporting a vulnerability

If you find a security issue, please open a private report via GitHub's ["Report a vulnerability"](https://github.com/Anant-Madhok231/clerk-ai/security/advisories/new) flow rather than a public issue. Include reproduction steps and the affected version. This is a personal project maintained on a best-effort basis, but security reports are prioritized.

## Scope

This policy covers the Clerk desktop application and the code in this repository. It does not cover third-party services Clerk integrates with (Google, OpenAI) - report issues with those directly to their respective security teams.
