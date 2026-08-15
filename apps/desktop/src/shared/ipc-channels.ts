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
  addSituationToCalendar: 'situation:addToCalendar',
  markSituationComplete: 'situation:markComplete',

  gmailConnect: 'gmail:connect',
  gmailDisconnect: 'gmail:disconnect',
  gmailCheckNow: 'gmail:checkNow',

  calendarConnect: 'calendar:connect',
  calendarDisconnect: 'calendar:disconnect',
  calendarListUpcoming: 'calendar:listUpcoming',

  getSyncStatus: 'sync:getStatus',

  importDocument: 'documents:import',
  showOpenDocumentDialog: 'documents:showOpenDialog',

  getSettings: 'settings:get',
  updateSettings: 'settings:update',
  hasOpenAIApiKey: 'settings:hasOpenAIApiKey',
  setOpenAIApiKey: 'settings:setOpenAIApiKey',
  clearOpenAIApiKey: 'settings:clearOpenAIApiKey',
  deleteAllData: 'settings:deleteAllData',

  situationsChanged: 'clerk:situationsChanged',
  syncStatusChanged: 'clerk:syncStatusChanged',
  navigateToSettings: 'clerk:navigateToSettings',

  openExternal: 'app:openExternal',
  getAppInfo: 'app:getInfo'
} as const

export type SituationStatusValue = 'ACTION' | 'WAITING' | 'COMPLETED' | 'INFORMATIONAL'
export type SituationPriorityValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface SituationListItem {
  id: string
  title: string
  summary: string
  status: SituationStatusValue
  priority: SituationPriorityValue
  amount: number | null
  currency: string | null
  waitingOn: string | null
  deadline: string | null
  confidence: number
  calendarEventId: string | null
  updatedAt: string
}

export interface SituationSourceSummary {
  id: string
  subject: string | null
  sender: string | null
  receivedAt: string
  role: string | null
  sourceType: string
  fileName: string | null
}

export interface SituationEventSummary {
  id: string
  eventType: string
  fromStatus: string | null
  toStatus: string | null
  occurredAt: string
}

export interface SituationDetail extends SituationListItem {
  category: string | null
  nextAction: string | null
  deadlineConfidence: number | null
  sources: SituationSourceSummary[]
  events: SituationEventSummary[]
}

export interface LoadDemoDataResult {
  processedCount: number
}

export interface GmailStatus {
  connected: boolean
}

export interface CalendarStatus {
  connected: boolean
}

export interface UpcomingCalendarEventView {
  id: string
  title: string
  start: string
  isAllDay: boolean
}

export interface SyncStatus {
  gmailConnected: boolean
  calendarConnected: boolean
  checking: boolean
  lastCheckedAt: string | null
}

export interface GmailCheckNowResult {
  checked: boolean
  processedCount: number
}

export interface AddToCalendarResult {
  eventId: string
  htmlLink: string
}

export interface ImportDocumentResult {
  outcome: 'created' | 'updated' | 'skipped-duplicate'
  situationId?: string
  status?: SituationStatusValue
}

export interface AppSettingsView {
  theme: 'system' | 'light' | 'dark'
  onboardingCompleted: boolean
  categories: {
    bills: boolean
    deadlines: boolean
    forms: boolean
    appointments: boolean
    applications: boolean
    refunds: boolean
    waitingOn: boolean
  }
  backgroundMonitoringEnabled: boolean
  syncIntervalMinutes: number
  notifications: {
    highPriorityActions: boolean
    upcomingDeadlines: boolean
    resolutions: boolean
  }
  aiProviderKind: 'demo' | 'openai'
}

export type AppSettingsPatchView = Partial<Omit<AppSettingsView, 'categories' | 'notifications'>> & {
  categories?: Partial<AppSettingsView['categories']>
  notifications?: Partial<AppSettingsView['notifications']>
}

export interface AppInfo {
  version: string
  repositoryUrl: string
  websiteUrl: string
}

export interface ClerkApi {
  loadDemoData(): Promise<LoadDemoDataResult>
  listSituations(): Promise<SituationListItem[]>
  getSituationDetail(situationId: string): Promise<SituationDetail | null>
  addSituationToCalendar(situationId: string): Promise<AddToCalendarResult>
  markSituationComplete(situationId: string): Promise<void>

  gmailConnect(): Promise<GmailStatus>
  gmailDisconnect(): Promise<GmailStatus>
  gmailCheckNow(): Promise<GmailCheckNowResult>

  calendarConnect(): Promise<CalendarStatus>
  calendarDisconnect(): Promise<CalendarStatus>
  calendarListUpcoming(): Promise<UpcomingCalendarEventView[]>

  getSyncStatus(): Promise<SyncStatus>

  importDocument(filePath: string): Promise<ImportDocumentResult>
  showOpenDocumentDialog(): Promise<string[]>

  getSettings(): Promise<AppSettingsView>
  updateSettings(patch: AppSettingsPatchView): Promise<AppSettingsView>
  hasOpenAIApiKey(): Promise<boolean>
  setOpenAIApiKey(apiKey: string): Promise<void>
  clearOpenAIApiKey(): Promise<void>
  deleteAllData(): Promise<void>

  openExternal(url: string): Promise<void>
  getAppInfo(): Promise<AppInfo>

  onSituationsChanged(callback: () => void): () => void
  onSyncStatusChanged(callback: () => void): () => void
  onNavigateToSettings(callback: () => void): () => void
}
