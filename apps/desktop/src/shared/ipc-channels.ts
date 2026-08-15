/**
 * Channel names, plain types, and the preload API shape — safe to import
 * from the sandboxed preload script and the renderer, neither of which can
 * require() arbitrary npm packages (e.g. zod) at runtime. Validation schemas
 * live in ipc-contract.ts, imported by the main process only.
 */
export const IPC_CHANNELS = {
  loadDemoData: 'demo:load',
  listSituations: 'situation:list',
  getSituationDetail: 'situation:getDetail',
  gmailConnect: 'gmail:connect',
  gmailStatus: 'gmail:status',
  gmailTestFetch: 'gmail:testFetch'
} as const

export interface SituationListItem {
  id: string
  title: string
  status: string
  priority: string
  amount: number | null
  currency: string | null
  waitingOn: string | null
  deadline: string | null
  updatedAt: string
}

export interface SituationSourceSummary {
  id: string
  subject: string | null
  sender: string | null
  receivedAt: string
  role: string | null
}

export interface SituationEventSummary {
  id: string
  eventType: string
  fromStatus: string | null
  toStatus: string | null
  occurredAt: string
}

export interface SituationDetail {
  id: string
  title: string
  summary: string
  status: string
  priority: string
  amount: number | null
  currency: string | null
  waitingOn: string | null
  deadline: string | null
  nextAction: string | null
  sources: SituationSourceSummary[]
  events: SituationEventSummary[]
}

export interface LoadDemoDataResult {
  processedCount: number
}

export interface GmailStatus {
  connected: boolean
}

export interface GmailTestFetchResult {
  count: number
  ids: string[]
}

export interface ClerkApi {
  loadDemoData(): Promise<LoadDemoDataResult>
  listSituations(): Promise<SituationListItem[]>
  getSituationDetail(situationId: string): Promise<SituationDetail | null>
  gmailConnect(): Promise<GmailStatus>
  gmailStatus(): Promise<GmailStatus>
  gmailTestFetch(): Promise<GmailTestFetchResult>
}
