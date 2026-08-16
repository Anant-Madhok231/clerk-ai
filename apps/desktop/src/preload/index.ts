import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IPC_CHANNELS, type ClerkApi } from '@shared/ipc-channels'

// keeping this narrow and typed, never exposing raw ipcRenderer/fs/process
// to the renderer
const clerkApi: ClerkApi = {
  loadDemoData: () => ipcRenderer.invoke(IPC_CHANNELS.loadDemoData),
  listSituations: () => ipcRenderer.invoke(IPC_CHANNELS.listSituations),
  getSituationDetail: (situationId) =>
    ipcRenderer.invoke(IPC_CHANNELS.getSituationDetail, { situationId }),
  addSituationToCalendar: (situationId) =>
    ipcRenderer.invoke(IPC_CHANNELS.addSituationToCalendar, { situationId }),
  markSituationComplete: (situationId) =>
    ipcRenderer.invoke(IPC_CHANNELS.markSituationComplete, { situationId }),

  gmailConnect: () => ipcRenderer.invoke(IPC_CHANNELS.gmailConnect),
  gmailDisconnect: () => ipcRenderer.invoke(IPC_CHANNELS.gmailDisconnect),
  gmailCheckNow: () => ipcRenderer.invoke(IPC_CHANNELS.gmailCheckNow),

  calendarConnect: () => ipcRenderer.invoke(IPC_CHANNELS.calendarConnect),
  calendarDisconnect: () => ipcRenderer.invoke(IPC_CHANNELS.calendarDisconnect),
  calendarListUpcoming: () => ipcRenderer.invoke(IPC_CHANNELS.calendarListUpcoming),

  getSyncStatus: () => ipcRenderer.invoke(IPC_CHANNELS.getSyncStatus),

  importDocument: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.importDocument, { filePath }),
  showOpenDocumentDialog: () => ipcRenderer.invoke(IPC_CHANNELS.showOpenDocumentDialog),

  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.getSettings),
  updateSettings: (patch) => ipcRenderer.invoke(IPC_CHANNELS.updateSettings, patch),
  hasOpenAIApiKey: () => ipcRenderer.invoke(IPC_CHANNELS.hasOpenAIApiKey),
  setOpenAIApiKey: (apiKey) => ipcRenderer.invoke(IPC_CHANNELS.setOpenAIApiKey, { apiKey }),
  clearOpenAIApiKey: () => ipcRenderer.invoke(IPC_CHANNELS.clearOpenAIApiKey),
  deleteAllData: () => ipcRenderer.invoke(IPC_CHANNELS.deleteAllData),

  listTrackedSenders: () => ipcRenderer.invoke(IPC_CHANNELS.listTrackedSenders),
  addTrackedSender: (input) => ipcRenderer.invoke(IPC_CHANNELS.addTrackedSender, input),
  removeTrackedSender: (id) => ipcRenderer.invoke(IPC_CHANNELS.removeTrackedSender, { id }),

  openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.openExternal, { url }),
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.getAppInfo),

  onSituationsChanged: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on(IPC_CHANNELS.situationsChanged, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.situationsChanged, listener)
  },
  onSyncStatusChanged: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on(IPC_CHANNELS.syncStatusChanged, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.syncStatusChanged, listener)
  },
  onNavigateToSettings: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on(IPC_CHANNELS.navigateToSettings, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.navigateToSettings, listener)
  }
}

contextBridge.exposeInMainWorld('clerk', clerkApi)

// separate from clerkApi since this is just a direct webUtils passthrough,
// no round trip to main needed - dropped files don't expose .path directly
// anymore so we need this
contextBridge.exposeInMainWorld('clerkFiles', {
  getPathForFile: (file: File): string => webUtils.getPathForFile(file)
})
