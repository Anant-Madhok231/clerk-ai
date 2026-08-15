# Architecture

## Why Electron

Clerk needs a local Node runtime for SQLite, OS-level OAuth token storage, background polling, native notifications, and a system tray - none of which a browser-only app can do. Electron is the pragmatic way to ship that as a normal double-click-to-install app on macOS and Windows.

## Process boundaries

```
apps/desktop/src/main       Electron main process: SQLite, Gmail/Calendar
                             adapters, the agent pipeline, IPC handlers, tray,
                             notifications, background sync timer.
apps/desktop/src/preload    Narrow contextBridge surface. The renderer gets
                             typed async functions, nothing else - no Node,
                             no filesystem, no arbitrary IPC channel access.
apps/desktop/src/renderer   React UI. Pure presentation + IPC calls.
```

`contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true` are set on every `BrowserWindow`. Every IPC handler validates its payload with a Zod schema (`apps/desktop/src/shared/ipc.ts`) before touching the database, so a compromised renderer can't smuggle arbitrary arguments into main-process code.

## The agent pipeline

`packages/agent/src/workflow.ts` defines the per-source pipeline as a LangGraph `StateGraph`: find candidate situations → extract structured fields → apply the result (create, update, or resolve a situation) → decide whether to notify. A graph earns its keep here specifically because the branch taken changes which tool calls run next, and it gives a natural seam for adding a human-in-the-loop pause (e.g. "confirm before creating") without restructuring the pipeline later.

The model - or Demo Mode's rule-based stand-in - never touches the database directly. It returns a `SituationTools`-mediated set of effects (`createSituation`, `updateSituation`, `recordSituationEvent`, ...), each with its own validated inputs. This is also why the agent stays a single conceptual "Clerk" rather than a cast of named sub-agents: it's one graph with one tool surface, not a supervisor coordinating specialized personas.

## Deterministic matching before AI

`packages/core/src/matching.ts` runs cheap, explainable checks - same Gmail thread, matching order/reference number, same sender domain, wording overlap - before any model call. A follow-up email in the same thread as an open situation, or one that repeats an order number, gets matched without spending a model call on it. The AI provider only has to decide relationship type (new / update / resolution) and extract structured fields; it doesn't have to search the whole situation history from scratch.

## Provider abstraction

`AIProvider` (`packages/agent/src/provider.ts`) has three implementations: `DemoAIProvider` (deterministic, offline, used as the test fixture), `OpenAIExtractionProvider` (real structured-output calls via `chat.completions.parse` against a Zod schema), and `ClerkCloudProvider` (an intentionally unimplemented placeholder for a future hosted service - the point is that the boundary already exists, not that the service does).

## Data model

`SourceItem` (a Gmail message or document) is many-to-many with `Situation` via `SituationSource`, so a single situation can accumulate evidence from several messages over time - which is what makes the WAITING → COMPLETED transition work without creating a duplicate. `SituationEvent` is an append-only audit trail (`CREATED`, `STATE_CHANGED`, `MARKED_COMPLETE`, ...) that backs the timeline shown in the situation detail view.

## Known limitations

- Image documents (PNG/JPG) are stored and hashed for dedup, but text isn't extracted from them yet - that requires routing to a vision-capable model call, which isn't wired into the V1 pipeline (see `apps/desktop/src/main/integrations/documents.ts`).
- The OpenAI provider is exercised by type-checking and by manual testing against a real key; it isn't covered by the automated test suite, since that would require committing a live API key.
- Gmail/Calendar OAuth is fully implemented but requires a Google Cloud OAuth client to exercise - see the README's "Gmail OAuth setup" section.
