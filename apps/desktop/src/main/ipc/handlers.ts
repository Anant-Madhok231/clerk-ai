import { ipcMain } from 'electron'
import { GetSituationDetailRequestSchema, IPC_CHANNELS } from '@shared/ipc-contract'
import type { LoadDemoDataResult, SituationDetail, SituationListItem } from '@shared/ipc-channels'
import type { Db } from '../db/client'
import type { AIProvider } from '../ai/AIProvider'
import { runDemoIngestion } from '../demo/runDemoIngestion'
import { getSituationDetail, listSituations } from '../situations/situationRepository'

export interface IpcDependencies {
  db: Db
  aiProvider: AIProvider
}

export function registerIpcHandlers({ db, aiProvider }: IpcDependencies): void {
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
}
