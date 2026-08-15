import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC_CHANNELS,
  type ClerkApi,
  type LoadDemoDataResult,
  type SituationDetail,
  type SituationListItem
} from '@shared/ipc-channels'

// Narrow, typed surface only — no raw ipcRenderer, fs, or process is ever
// exposed to the renderer.
const clerkApi: ClerkApi = {
  loadDemoData: (): Promise<LoadDemoDataResult> => ipcRenderer.invoke(IPC_CHANNELS.loadDemoData),
  listSituations: (): Promise<SituationListItem[]> => ipcRenderer.invoke(IPC_CHANNELS.listSituations),
  getSituationDetail: (situationId: string): Promise<SituationDetail | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.getSituationDetail, { situationId })
}

contextBridge.exposeInMainWorld('clerk', clerkApi)
