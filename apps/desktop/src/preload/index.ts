import { contextBridge, ipcRenderer } from "electron";
import { IpcChannel } from "@shared/ipc.js";

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, payload)) as IpcResult<T>;
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

/**
 * The only Node/Electron surface exposed to the renderer. No filesystem, no
 * child_process, no direct database access - just typed calls into the
 * validated IPC handlers registered in main/ipc/handlers.ts.
 */
const clerkApi = {
  getDashboard: () => invoke(IpcChannel.getDashboard),
  getSituation: (situationId: string) => invoke(IpcChannel.getSituation, { situationId }),
  getSituationsByStatus: (status: string) => invoke("clerk:getSituationsByStatus", status),
  markComplete: (situationId: string) => invoke(IpcChannel.markComplete, { situationId }),
  confirmSituation: (situationId: string) => invoke(IpcChannel.confirmSituation, { situationId }),
  addToCalendar: (situationId: string, confirm: boolean) =>
    invoke(IpcChannel.addToCalendar, { situationId, confirm }),
  openSource: (sourceId: string) => invoke(IpcChannel.openSource, { sourceId }),

  getSettings: () => invoke(IpcChannel.getSettings),
  updateSettings: (patch: unknown) => invoke(IpcChannel.updateSettings, patch),
  completeOnboarding: () => invoke(IpcChannel.completeOnboarding),

  connectGmail: () => invoke(IpcChannel.connectGmail),
  disconnectGmail: () => invoke(IpcChannel.disconnectGmail),
  checkInboxNow: () => invoke(IpcChannel.checkInboxNow),
  getGmailStatus: () => invoke(IpcChannel.getGmailStatus),

  connectCalendar: () => invoke(IpcChannel.connectCalendar),
  disconnectCalendar: () => invoke(IpcChannel.disconnectCalendar),

  importDocument: () => invoke(IpcChannel.importDocument),
  listDocumentSources: () => invoke("clerk:listDocumentSources"),

  setApiKey: (apiKey: string) => invoke(IpcChannel.setApiKey, { apiKey }),
  clearApiKey: () => invoke(IpcChannel.clearApiKey),
  getAiProviderStatus: () => invoke(IpcChannel.getAiProviderStatus),

  deleteAllData: () => invoke(IpcChannel.deleteAllData),
  openExternal: (url: string) => invoke(IpcChannel.openExternal, { url }),
  seedDemoData: () => invoke(IpcChannel.seedDemoData),
};

export type ClerkApi = typeof clerkApi;

contextBridge.exposeInMainWorld("clerk", clerkApi);
