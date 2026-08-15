import { ipcMain } from 'electron'
import { GetSituationDetailRequestSchema, IPC_CHANNELS } from '@shared/ipc-contract'
import type {
  GmailStatus,
  GmailTestFetchResult,
  LoadDemoDataResult,
  SituationDetail,
  SituationListItem
} from '@shared/ipc-channels'
import type { Db } from '../db/client'
import type { AIProvider } from '../ai/AIProvider'
import type { GmailAdapter } from '../integrations/gmail'
import { runDemoIngestion } from '../demo/runDemoIngestion'
import { getSituationDetail, listSituations } from '../situations/situationRepository'

export interface IpcDependencies {
  db: Db
  aiProvider: AIProvider
  gmailAdapter: GmailAdapter
}

export function registerIpcHandlers({ db, aiProvider, gmailAdapter }: IpcDependencies): void {
  ipcMain.handle(IPC_CHANNELS.loadDemoData, async (): Promise<LoadDemoDataResult> => {
    const results = await runDemoIngestion(db, aiProvider)
    return { processedCount: results.length }
  })

  ipcMain.handle(IPC_CHANNELS.listSituations, (): SituationListItem[] => {
    return listSituations(db)
  })

  ipcMain.handle(
    IPC_CHANNELS.getSituationDetail,
    (_event, payload: unknown): SituationDetail | null => {
      const { situationId } = GetSituationDetailRequestSchema.parse(payload)
      return getSituationDetail(db, situationId)
    }
  )

  ipcMain.handle(IPC_CHANNELS.gmailConnect, async (): Promise<GmailStatus> => {
    await gmailAdapter.connect()
    return { connected: gmailAdapter.isConnected() }
  })

  ipcMain.handle(IPC_CHANNELS.gmailStatus, (): GmailStatus => {
    return { connected: gmailAdapter.isConnected() }
  })

  ipcMain.handle(IPC_CHANNELS.gmailTestFetch, async (): Promise<GmailTestFetchResult> => {
    const messages = await gmailAdapter.listRecentMessageIds(5)
    return { count: messages.length, ids: messages.map((m) => m.id) }
  })
}
