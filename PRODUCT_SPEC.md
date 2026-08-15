# Clerk — Product Specification

Clerk is a cross-platform desktop application: a personal AI admin agent.

**Tagline:** Your personal AI admin agent.

**Consumer explanation:** Clerk reads the boring stuff and tells you what actually needs your attention.

This document is the source of truth for what Clerk is and how it must be built. It supersedes ad-hoc decisions made in any single session. `CLAUDE.md` holds the short, permanent operating rules derived from this spec; read both before making architectural changes.

---

## 0. Existing GitHub situation (critical, read first)

A previous automated development attempt already created a public GitHub repository and Pages site. They already exist and are **frozen** during this rebuild:

- Owner: `Anant-Madhok231`
- Repository: `Anant-Madhok231/clerk-ai` — https://github.com/Anant-Madhok231/clerk-ai
- Pages site: https://Anant-Madhok231.github.io/clerk-ai/
- Releases: https://github.com/Anant-Madhok231/clerk-ai/releases

**Do not** create another GitHub repository, change the final repository name, or change the final Pages URL. The eventual finished rebuild replaces the contents of the existing repository — but only after the owner explicitly authorizes migration. Until then:

Do NOT push, force-push, delete branches, rewrite remote history, modify `main`, modify GitHub Pages, create GitHub Releases, delete existing releases, alter repository or Pages settings, create a second or similarly-named repository, deploy the rebuilt website, or modify the existing public site.

Local work (build, run, test, debug, package, verify, build a new Pages site locally, prepare CI/release workflows locally) is unrestricted. Remote migration is a separate, later phase requiring explicit authorization from the owner.

### Local workspace identity

| | |
|---|---|
| Local workspace folder | `clerk-code-rebuild` (name is not significant, not renamed to match GitHub) |
| Product name | Clerk |
| Final remote repository | `Anant-Madhok231/clerk-ai` |
| Final website | `https://Anant-Madhok231.github.io/clerk-ai/` |

### Not reusing the previous implementation

A previous (failed) Clerk implementation may exist elsewhere on this machine. It is not searched for, opened, copied from, or reused in any way (code, `node_modules`, database, `.env`, Electron config, build output, git history) unless explicitly instructed later. Only the public identifiers above (owner, repo name, Pages URL) are carried forward.

### Eventual remote migration (not executed yet)

Once the local rebuild is fully verified, the plan is:

1. Obtain explicit authorization.
2. Inspect/fetch the existing remote repository.
3. Preserve the previous remote state via a clearly labeled backup branch/tag (e.g. `legacy-cowork-build`, `legacy-before-clean-rebuild`).
4. Verify the backup exists.
5. Determine the safest way to make the clean implementation the new `main` (avoid destructive force-push unless genuinely necessary).
6. Explain the exact remote changes before executing them.
7. Update the existing repository rather than creating another one.
8. Deploy the replacement Pages site to the same existing URL.
9. Preserve release history where reasonable; publish new installers as a new release.

None of this is executed without explicit authorization.

---

## 1. Product purpose

Clerk monitors administrative information coming into someone's life. Sources in V1: Gmail, PDFs, images/screenshots, TXT documents, optionally DOCX if reliable. Google Calendar is an external *action* integration (write-gated, never silent).

For each piece of information Clerk determines: does the user need to do something; is the user waiting on someone else; did something the user was waiting on get resolved; is this merely informational; is there a deadline; is money involved; what is the priority; does this update an existing situation; should Clerk notify the user; can Clerk help with the next action.

## 2. Core states

Every processed source maps to one of four outcomes:

- **ACTION** — the user must do something (e.g. "Pay rent, $1,850, due tomorrow").
- **WAITING** — the user already acted and is waiting on someone/something else (e.g. "Amazon refund, waiting on Amazon").
- **COMPLETED** — an existing ACTION or WAITING situation has been resolved. A resolution email must update the *same* situation, never create a new one.
- **INFORMATIONAL** — no action and no resolution (newsletters, marketing, ordinary receipts). Stays outside the main action dashboard.

## 3. Situation tracking (flagship behavior)

Clerk is not `email → AI → summary`. Its defining behavior is persistent tracking of real-world situations across multiple related messages/documents over time, producing **one situation with a timeline of events**, not several disconnected items. Example: refund requested → acknowledged → approved → processed should be one `Situation` row with four `SituationEvent` rows, not four cards.

## 4. One conceptual agent

Clerk is one primary personal-admin agent, not a swarm of named sub-agents (no `EmailAgent`/`SupervisorAgent`/`ManagerAgent`/etc.). Conceptually:

```
                 CLERK
                   |
      +------------+------------+
      |            |            |
    Gmail      Documents     Calendar
     tools        tools        tools
      |            |            |
      +------------+------------+
                   |
             Situation State
                   |
                 SQLite
```

Code modules may be separated for clarity; the conceptual model stays one agent.

## 5. Technical stack

- Electron + React + TypeScript (strict) + Vite + electron-builder, Node.js 20+.
- Electron is intentional: local Node runtime, desktop packaging, background processing, native notifications, tray, OAuth, filesystem import, secure secret handling, macOS/Windows distribution. Not a browser-only product.
- AI: LangGraph JS/TS for stateful orchestration where it genuinely helps, Zod for structured outputs, explicit tool boundaries, an `AIProvider` abstraction with `DemoAIProvider` and `OpenAIProvider` implemented (a future hosted provider is a design seam, not a stub class built now).
- Database: local SQLite (`better-sqlite3`, Drizzle ORM once schema complexity earns it). Automatic creation/migration in Electron's per-user app data path — no user-facing DB setup.
- Frontend: React + TypeScript, restrained accessible UI (Radix primitives, Lucide icons, TanStack Query/Zustand only where genuinely useful — no overlapping state libraries).
- Testing: Vitest, React Testing Library, service/integration tests, Playwright and Electron integration tests where practical. Real state-transition tests, not snapshot-only.

## 6. Project structure

Guidance, not dogma — use fewer packages if that's cleaner; do not create architecture theater.

```
clerk-code-rebuild/
  apps/
    desktop/        electron/ + renderer/
    site/
  packages/
    agent/ core/ database/ integrations/ ui/   (extracted opportunistically, not scaffolded up front)
  docs/ scripts/ .github/workflows/
  CLAUDE.md PRODUCT_SPEC.md README.md CONTRIBUTING.md SECURITY.md CHANGELOG.md LICENSE package.json .gitignore
```

## 7. Git discipline during the rebuild

Local git is used freely (`git init`, real commits for real milestones). The existing GitHub repository is **not** configured as a remote during the rebuild; `git remote -v` should show nothing until explicit authorization. No `git push`, `--force`, `gh repo create/delete` against production. No fabricated commit history.

## 8. Product identity

- Product: Clerk. Owner/display metadata: Anant Madhok. GitHub username: `Anant-Madhok231`. Final repository: `clerk-ai`. Bundle identifier: `com.anantmadhok.clerkai`.
- Must not use Clerk.com's authentication SDK — name collision only.

## 9. Data model

**SourceItem** — id, sourceType, provider, providerId, threadId, sender, subject, snippet, receivedAt, fileName, contentHash, metadata, createdAt, updatedAt.

**Situation** — id, title, summary, status (`ACTION | WAITING | COMPLETED | INFORMATIONAL`), priority (`LOW | MEDIUM | HIGH | URGENT`), category, nextAction, deadline, deadlineConfidence, amount, currency, waitingOn, confidence, userConfirmed, createdAt, updatedAt, resolvedAt.

**SituationSource** — many-to-many join between Situation and SourceItem.

**SituationEvent** — CREATED, SOURCE_ADDED, STATE_CHANGED, DEADLINE_CHANGED, USER_CONFIRMED, CALENDAR_EVENT_CREATED, MARKED_COMPLETE.

**Settings** — user preferences. No plaintext secrets ever stored here or anywhere else.

## 10. Situation matching / reconciliation

Before creating anything new, search for related situations. Deterministic evidence first: Gmail thread ID, order/ticket/application ID, sender/domain, company, amount, names, subject similarity. Semantic/model-based matching only when deterministic signals are insufficient. This logic gets heavy test coverage — it is the flagship engineering piece (§3).

## 11. Structured model output

Never parse arbitrary prose as application state. Every AI classification response is validated against a strict Zod schema before touching persistence, with bounded retries on malformed output. Concepts a classification result carries: classification, title, summary, category, priority, deadline, deadlineConfidence, amount, currency, nextAction, waitingOn, confidence, relatedSituationId, relationshipType, resolutionEvidence, requiresUserConfirmation, evidenceSummary.

## 12. AI providers

- `DemoAIProvider` — mandatory, deterministic, no credentials required. Used for development, tests, and the GitHub Pages demo concept.
- `OpenAIProvider` — user brings their own API key. Never stored in source, `localStorage`, git, or renderer-visible config; goes through OS-protected storage (Electron `safeStorage`, not `keytar`, unless a concrete `safeStorage` limitation is found).
- A future hosted provider is left as a clean interface seam, not implemented in V1.

## 13. Confidence

- `>= 0.85`: present normally.
- `0.60–0.84`: show as uncertain, require user confirmation.
- `< 0.60`: do not establish a precise fact automatically.

No hidden chain-of-thought exposed to the user; short evidence summaries only.

## 14. Documents

PDF, PNG, JPEG/JPG, TXT at minimum; DOCX only if reliably parseable. Drag-and-drop and an Import button. Type/size validation. Imported content is never executed. Local text extraction where practical; multimodal model input for images/scanned documents when a real provider is configured.

## 15. Gmail

Real OAuth2 desktop flow (system browser, never an embedded password prompt). Minimum scope — read-only in V1. Initial sync ~30 days, sensible cap, skip spam/trash, dedupe by message ID, thread-aware, incremental afterward via Gmail history with bounded resync on expired history. Never send an entire inbox in one AI request. Graceful handling of offline, expired/revoked token, rate limits, Google errors — existing Clerk data stays accessible regardless.

## 16. Google Calendar

Write-gated action integration only — Clerk proposes, user confirms, then and only then an event is created. Store the event ID; prevent duplicates. Never silently modify the user's calendar.

## 17. Native notifications & background operation

OS-native notifications, spam-avoidant, preference-gated. Tray/menu bar (macOS) and system tray (Windows) with a real Quit. Reasonable polling interval (10–15 minutes).

## 18. Settings surface

Accounts (Gmail, Calendar), Clerk (categories, monitoring, scan options), Notifications, Appearance (System/Light/Dark), AI (Demo/OpenAI provider + status), Privacy (disconnect Gmail/Calendar, delete Clerk data), About (version + final repo/site links).

## 19. Privacy

Only connected services, revocable access, primarily local state, source traceability, deletable data, minimal external transmission. Never log OAuth refresh tokens, API keys, authorization headers, or passwords. Avoid storing complete Gmail bodies indefinitely without reason.

## 20. Demo Mode

Mandatory — a reviewer must be able to understand Clerk without Gmail. Demo Mode runs fake `SourceItem`s through the **real** ingestion → matching → classification/reconciliation → persistence → UI pipeline, substituting only the AI classification step with deterministic `DemoAIProvider` logic. It must demonstrate a real WAITING → COMPLETED timeline produced by two related fake source items joined by real matching logic — never a hardcoded pre-built `Situation` card injected into the UI.

Example demo situations: rent ACTION, internship-form ACTION, Amazon-refund WAITING→COMPLETED, apartment-maintenance WAITING, flight-refund COMPLETED.

## 21. Distribution

- **macOS**: `.dmg`, drag-to-Applications, no terminal/npm/Node required by the end user. Apple Silicon primary target, Intel where practical. Code signing/notarization configured but not blocking on missing credentials.
- **Windows**: NSIS-based installer (`.exe`), correct branding/icon, clean install/uninstall, correct AppData location, no Node/npm/Python requirement. Verified via `windows-latest` GitHub Actions, not claimed as locally tested on this macOS machine.

## 22. Electron security model

`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, no `@electron/remote`. Narrow typed preload/`contextBridge` API only — never expose raw `fs`, `child_process`, `process.env`, or `require` to the renderer. Runtime IPC payload validation via Zod. External links open in the system browser, never in-app.

## 23. Safe side effects

Clerk may autonomously read authorized Gmail, inspect explicitly imported files, update its own local database, and show notifications. It must request confirmation before creating Calendar events or changing other external state. It must never autonomously send email, delete mail, send money, make purchases, accept contracts, submit legal forms, or cancel subscriptions.

## 24. Testing requirements (minimum)

ACTION classification with amount/deadline extraction; WAITING classification; resolution of an existing WAITING situation to COMPLETED (same situation ID, not a new one); INFORMATIONAL classification; ambiguous-deadline handling (no fabricated exact date); duplicate-message prevention (same Gmail ID twice → no duplicate); persistence across restart; Calendar-write requires confirmation; graceful degradation on OAuth failure (existing data stays available).

## 25. Engineering quality bar

Clear modules, meaningful naming, idiomatic TypeScript, simple control flow, reasonable (not excessive) abstraction, explicit security boundaries, testability, low duplication. Comments explain *why*, not *what* — no generic AI-boilerplate comments, no "Generated by Claude" markers, no false "100% handwritten" claims either. Domain-named files (`gmailSync.ts`, `situationService.ts`, `matchSituation.ts`) over generic ones (`utils.ts`, `helpers.ts`, `misc.ts`). No giant files, no abstraction theater (`AbstractBaseServiceFactoryManager`-style naming), no seven layers for a simple operation.

## 26. Definition of done for the local rebuild

Electron opens; React UI works; Clerk branding exists; onboarding works; Demo Mode works end-to-end through the real pipeline; SQLite persists across restart; ACTION/WAITING/COMPLETED/INFORMATIONAL all work; matching and resolution detection work with real tests; structured outputs validate; confidence thresholds work; source traceability works; document import works; a Gmail adapter exists (live-verified if credentials are available, otherwise fully mock-tested with live verification flagged as pending); a Calendar adapter exists with confirmation gating; native notifications and tray exist; secrets are protected via `safeStorage`; errors are handled with consumer-friendly messages; a macOS `.dmg` builds locally where possible; Windows packaging is correctly configured (CI-verified); a replacement Pages site builds locally; CI/release/Pages workflow files exist locally; tests, lint, typecheck, and build all pass.

None of this requires touching the existing production GitHub repository or Pages site during this phase.

## 27. Final handoff (when the local rebuild is verified)

Provide: what's genuinely completed; exact commands run to verify each piece; paths to generated artifacts; external credentials/services still required; anything that needs Windows CI to verify; explicit confirmation that the existing remote repo and Pages site were not modified; and a concrete migration proposal (preserve old remote state via a backup branch/tag, then make the clean rebuild the new `main`, deploy the new Pages site to the same URL, publish new installers as a new release) — not executed until explicitly authorized.
