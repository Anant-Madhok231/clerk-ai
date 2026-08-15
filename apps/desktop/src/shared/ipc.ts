import { z } from "zod";

/**
 * The complete IPC surface exposed to the renderer via the preload bridge.
 * Every channel has a request schema validated on the main-process side, so
 * a compromised renderer can't smuggle arbitrary arguments into main.
 */
export const IpcChannel = {
  getDashboard: "clerk:getDashboard",
  getSituation: "clerk:getSituation",
  markComplete: "clerk:markComplete",
  confirmSituation: "clerk:confirmSituation",
  addToCalendar: "clerk:addToCalendar",
  openSource: "clerk:openSource",

  getSettings: "clerk:getSettings",
  updateSettings: "clerk:updateSettings",
  completeOnboarding: "clerk:completeOnboarding",

  connectGmail: "clerk:connectGmail",
  disconnectGmail: "clerk:disconnectGmail",
  checkInboxNow: "clerk:checkInboxNow",
  getGmailStatus: "clerk:getGmailStatus",

  connectCalendar: "clerk:connectCalendar",
  disconnectCalendar: "clerk:disconnectCalendar",

  importDocument: "clerk:importDocument",

  setApiKey: "clerk:setApiKey",
  clearApiKey: "clerk:clearApiKey",
  getAiProviderStatus: "clerk:getAiProviderStatus",

  deleteAllData: "clerk:deleteAllData",
  openExternal: "clerk:openExternal",
  seedDemoData: "clerk:seedDemoData",

  onDashboardUpdated: "clerk:onDashboardUpdated",
  onSyncStateChanged: "clerk:onSyncStateChanged",
} as const;

export const MarkCompleteRequest = z.object({ situationId: z.string() });
export const ConfirmSituationRequest = z.object({ situationId: z.string() });
export const AddToCalendarRequest = z.object({ situationId: z.string(), confirm: z.boolean() });
export const GetSituationRequest = z.object({ situationId: z.string() });
export const OpenSourceRequest = z.object({ sourceId: z.string() });
export const OpenExternalRequest = z.object({ url: z.string().url() });
export const SetApiKeyRequest = z.object({ apiKey: z.string().min(10) });

export const UpdateSettingsRequest = z.object({
  categories: z
    .object({
      bills: z.boolean().optional(),
      deadlines: z.boolean().optional(),
      forms: z.boolean().optional(),
      appointments: z.boolean().optional(),
      applications: z.boolean().optional(),
      refunds: z.boolean().optional(),
      waiting: z.boolean().optional(),
    })
    .partial()
    .optional(),
  backgroundMonitoring: z.boolean().optional(),
  scanIntervalMinutes: z.number().min(5).max(120).optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  aiProvider: z.enum(["demo", "openai"]).optional(),
  notifications: z
    .object({
      highPriorityActions: z.boolean().optional(),
      approachingDeadlines: z.boolean().optional(),
      completedWaiting: z.boolean().optional(),
    })
    .partial()
    .optional(),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsRequest>;
