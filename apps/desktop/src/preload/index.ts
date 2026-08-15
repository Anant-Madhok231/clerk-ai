import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type ClerkApi, type Note } from '@shared/ipc-channels'

// Narrow, typed surface only — no raw ipcRenderer, fs, or process is ever
// exposed to the renderer.
const clerkApi: ClerkApi = {
  getNote: (): Promise<Note> => ipcRenderer.invoke(IPC_CHANNELS.getNote),
  setNote: (text: string): Promise<Note> => ipcRenderer.invoke(IPC_CHANNELS.setNote, { text })
}

contextBridge.exposeInMainWorld('clerk', clerkApi)
