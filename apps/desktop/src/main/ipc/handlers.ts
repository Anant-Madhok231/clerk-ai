import { app, dialog, ipcMain, shell } from 'electron'
import {
  AddTrackedSenderInputSchema,
  ImportDocumentRequestSchema,
  IPC_CHANNELS,
  OpenExternalRequestSchema,
  RemoveTrackedSenderInputSchema,
  SetOpenAIApiKeyRequestSchema,
  SituationIdRequestSchema,
  UpdateSettingsRequestSchema
} from '@shared/ipc-contract'
import type {
  AddToCalendarResult,
  AppInfo,
  AppSettingsView,
  CalendarStatus,
  GmailCheckNowResult,
  GmailStatus,
  ImportDocumentResult,
  LoadDemoDataResult,
  SituationDetail,
  SituationListItem,
  SyncStatus,
  TrackedSenderView,
  UpcomingCalendarEventView
} from '@shared/ipc-channels'
import type { Db } from '../db/client'
import type { AIProvider } from '../ai/AIProvider'
import type { GmailAdapter } from '../integrations/gmail'
import type { CalendarAdapter } from '../integrations/calendar'
import { runDemoIngestion } from '../demo/runDemoIngestion'
import { getSituationDetail, listSituations } from '../situations/situationRepository'
import { addSituationToCalendar } from '../situations/addToCalendar'
import { markSituationComplete } from '../situations/markComplete'
import { deleteAllSituationData } from '../situations/deleteAllData'
import { deleteDemoSituationData } from '../situations/deleteDemoData'
import { addTrackedSender, getTrackedSenders, removeTrackedSender } from '../settings/trackedSenders'
import { runGmailBootstrapIfNeeded } from '../sync/gmailBootstrap'
import { importDocument } from '../documents/importDocument'
import { getAppSettings, updateAppSettings } from '../settings/appSettings'
import { clearOpenAIApiKey, loadOpenAIApiKey, saveOpenAIApiKey } from '../ai/apiKeyStore'
import { getSyncStatus } from '../sync/syncStatus'
import { checkGmailNow } from '../sync/checkNow'
import { broadcastSituationsChanged, broadcastSyncStatusChanged } from '../events/broadcast'

export interface IpcDependencies {
  db: Db
  aiProvider: AIProvider
  gmailAdapter: GmailAdapter
  calendarAdapter: CalendarAdapter
}

export function registerIpcHandlers({ db, aiProvider, gmailAdapter, calendarAdapter }: IpcDependencies): void {
  // --- Situations -----------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.loadDemoData, async (): Promise<LoadDemoDataResult> => {
    const results = await runDemoIngestion(db, aiProvider)
    broadcastSituationsChanged()
    return { processedCount: results.length }
  })

  ipcMain.handle(IPC_CHANNELS.listSituations, (): SituationListItem[] => listSituations(db))

  ipcMain.handle(
    IPC_CHANNELS.getSituationDetail,
    (_event, payload: unknown): SituationDetail | null => {
      const { situationId } = SituationIdRequestSchema.parse(payload)
      return getSituationDetail(db, situationId)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.addSituationToCalendar,
    async (_event, payload: unknown): Promise<AddToCalendarResult> => {
      const { situationId } = SituationIdRequestSchema.parse(payload)
      const result = await addSituationToCalendar(db, calendarAdapter, situationId)
      broadcastSituationsChanged()
      return result
    }
  )

  ipcMain.handle(IPC_CHANNELS.markSituationComplete, (_event, payload: unknown): void => {
    const { situationId } = SituationIdRequestSchema.parse(payload)
    markSituationComplete(db, situationId)
    broadcastSituationsChanged()
  })

  // --- Gmail ------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.gmailConnect, async (): Promise<GmailStatus> => {
    await gmailAdapter.connect()
    deleteDemoSituationData(db)
    broadcastSituationsChanged()
    broadcastSyncStatusChanged()
    // fire and forget - the 10 day backfill can take a while on a real
    // inbox and the ui shouldn't have to wait for it to know gmail's
    // connected. it broadcasts updates as results come in anyway
    void runGmailBootstrapIfNeeded({ db, aiProvider, gmailAdapter })
    return { connected: gmailAdapter.isConnected() }
  })

  ipcMain.handle(IPC_CHANNELS.gmailDisconnect, (): GmailStatus => {
    gmailAdapter.disconnect()
    broadcastSyncStatusChanged()
    return { connected: false }
  })

  ipcMain.handle(IPC_CHANNELS.gmailCheckNow, async (): Promise<GmailCheckNowResult> => {
    const { checked, results } = await checkGmailNow({ db, aiProvider, gmailAdapter })
    return { checked, processedCount: results.length }
  })

  // --- Calendar -----------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.calendarConnect, async (): Promise<CalendarStatus> => {
    await calendarAdapter.connect()
    deleteDemoSituationData(db)
    broadcastSituationsChanged()
    broadcastSyncStatusChanged()
    return { connected: calendarAdapter.isConnected() }
  })

  ipcMain.handle(IPC_CHANNELS.calendarDisconnect, (): CalendarStatus => {
    calendarAdapter.disconnect()
    broadcastSyncStatusChanged()
    return { connected: false }
  })

  ipcMain.handle(IPC_CHANNELS.calendarListUpcoming, async (): Promise<UpcomingCalendarEventView[]> => {
    if (!calendarAdapter.isConnected()) return []
    return calendarAdapter.listUpcomingEvents()
  })

  // --- Sync status --------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.getSyncStatus, (): SyncStatus => getSyncStatus(db))

  // --- Documents ------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.importDocument,
    async (_event, payload: unknown): Promise<ImportDocumentResult> => {
      const { filePath } = ImportDocumentRequestSchema.parse(payload)
      const result = await importDocument(db, aiProvider, filePath)
      broadcastSituationsChanged()
      return result.outcome === 'skipped-duplicate'
        ? { outcome: 'skipped-duplicate' }
        : { outcome: result.outcome, situationId: result.situationId, status: result.status }
    }
  )

  ipcMain.handle(IPC_CHANNELS.showOpenDocumentDialog, async (): Promise<string[]> => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Documents', extensions: ['pdf', 'txt', 'png', 'jpg', 'jpeg'] }]
    })
    return result.canceled ? [] : result.filePaths
  })

  // --- Settings -------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.getSettings, (): AppSettingsView => getAppSettings(db))

  ipcMain.handle(IPC_CHANNELS.updateSettings, (_event, payload: unknown): AppSettingsView => {
    const patch = UpdateSettingsRequestSchema.parse(payload)
    return updateAppSettings(db, patch)
  })

  ipcMain.handle(IPC_CHANNELS.hasOpenAIApiKey, (): boolean => loadOpenAIApiKey(db) !== null)

  ipcMain.handle(IPC_CHANNELS.setOpenAIApiKey, (_event, payload: unknown): void => {
    const { apiKey } = SetOpenAIApiKeyRequestSchema.parse(payload)
    saveOpenAIApiKey(db, apiKey)
  })

  ipcMain.handle(IPC_CHANNELS.clearOpenAIApiKey, (): void => {
    clearOpenAIApiKey(db)
  })

  ipcMain.handle(IPC_CHANNELS.deleteAllData, (): void => {
    deleteAllSituationData(db)
    broadcastSituationsChanged()
  })

  // --- Tracked senders -----------------------------------------------
  ipcMain.handle(IPC_CHANNELS.listTrackedSenders, (): TrackedSenderView[] => getTrackedSenders(db))

  ipcMain.handle(
    IPC_CHANNELS.addTrackedSender,
    (_event, payload: unknown): TrackedSenderView[] => {
      const input = AddTrackedSenderInputSchema.parse(payload)
      return addTrackedSender(db, input)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.removeTrackedSender,
    (_event, payload: unknown): TrackedSenderView[] => {
      const { id } = RemoveTrackedSenderInputSchema.parse(payload)
      return removeTrackedSender(db, id)
    }
  )

  // --- App / shell -------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.openExternal, async (_event, payload: unknown): Promise<void> => {
    const { url } = OpenExternalRequestSchema.parse(payload)
    await shell.openExternal(url)
  })

  ipcMain.handle(IPC_CHANNELS.getAppInfo, (): AppInfo => ({
    version: app.getVersion(),
    repositoryUrl: 'https://github.com/Anant-Madhok231/clerk-ai',
    websiteUrl: 'https://Anant-Madhok231.github.io/clerk-ai/'
  }))
}
