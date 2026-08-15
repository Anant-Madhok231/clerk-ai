# Changelog

## 1.0.0 - Unreleased

Initial release.

- Deterministic + AI-assisted classification of emails and documents into ACTION, WAITING, COMPLETED, and INFORMATIONAL situations.
- Related-situation matching (thread ID, reference code, merchant, wording similarity) with automatic WAITING → COMPLETED resolution.
- LangGraph-orchestrated agent pipeline with a Demo Mode provider (no API key required) and an OpenAI structured-output provider.
- SQLite persistence via Drizzle ORM, auto-initialized on first launch.
- Gmail read-only integration (OAuth desktop flow, bounded initial scan, incremental history-based sync with resync fallback).
- Google Calendar integration with explicit confirmation before any event is created.
- Document import (PDF, PNG, JPG, TXT) with local PDF text extraction and content-hash deduplication.
- Native desktop notifications, system tray with background monitoring controls.
- OS-protected secret storage (Electron `safeStorage`) for OAuth tokens and API keys.
- macOS (.dmg) and Windows (NSIS .exe) packaging via electron-builder.
- GitHub Actions CI, release, and Pages deployment workflows.
- Interactive public demo site.
