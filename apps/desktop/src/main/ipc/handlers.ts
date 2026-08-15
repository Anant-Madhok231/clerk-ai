import { ipcMain, shell, dialog, BrowserWindow } from "electron";
import { IpcChannel } from "@shared/ipc.js";
import {
  MarkCompleteRequest,
  ConfirmSituationRequest,
  AddToCalendarRequest,
  GetSituationRequest,
  OpenSourceRequest,
  OpenExternalRequest,
  SetApiKeyRequest,
  UpdateSettingsRequest,
} from "@shared/ipc.js";
import { getDashboard, getSituationsByStatus } from "../db/dashboardRepo.js";
import { SqliteSituationTools, getSituationEvents, getSituationSourceItems } from "../db/situationRepo.js";
import { getSourceById, listDocumentSources } from "../db/sourceRepo.js";
import { getSettings, updateSettings } from "../db/settingsRepo.js";
import { connectGmail, disconnectGmail, checkInboxNow, getGmailStatus } from "../integrations/gmail.js";
import { connectCalendar, disconnectCalendar, addSituationToCalendar } from "../integrations/calendar.js";
import { importDocument } from "../integrations/documents.js";
import { setSecret, clearSecret, getSecret, SecretKeys } from "../secureStore.js";
import { closeDb, getDbPath } from "../db/client.js";
import { seedDemoData } from "../db/seedDemo.js";
import fs from "node:fs";

const situationTools = new SqliteSituationTools();

function handle<T>(channel: string, fn: (payload: T) => Promise<unknown>) {
  ipcMain.handle(channel, async (_event, rawPayload: unknown) => {
    try {
      const data = await fn(rawPayload as T);
      return { ok: true as const, data };
    } catch (error) {
      return { ok: false as const, error: friendlyErrorMessage(error) };
    }
  });
}

function friendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function registerIpcHandlers(): void {
  handle(IpcChannel.getDashboard, async () => getDashboard());

  handle(IpcChannel.getSituation, async (raw) => {
    const { situationId } = GetSituationRequest.parse(raw);
    const situation = await situationTools.getSituation(situationId);
    if (!situation) throw new Error("That situation could not be found.");
    const [events, sources] = await Promise.all([
      getSituationEvents(situationId),
      getSituationSourceItems(situationId),
    ]);
    return { situation, events, sources };
  });

  handle(IpcChannel.markComplete, async (raw) => {
    const { situationId } = MarkCompleteRequest.parse(raw);
    const updated = await situationTools.updateSituation(situationId, {
      status: "COMPLETED",
      resolvedAt: new Date().toISOString(),
    });
    await situationTools.recordSituationEvent(situationId, "MARKED_COMPLETE", "Marked complete by user.");
    return updated;
  });

  handle(IpcChannel.confirmSituation, async (raw) => {
    const { situationId } = ConfirmSituationRequest.parse(raw);
    const updated = await situationTools.updateSituation(situationId, {});
    await situationTools.recordSituationEvent(situationId, "USER_CONFIRMED", "User confirmed the detected details.");
    return updated;
  });

  handle(IpcChannel.addToCalendar, async (raw) => {
    const { situationId, confirm } = AddToCalendarRequest.parse(raw);
    if (!confirm) throw new Error("Calendar event was not confirmed.");
    const eventId = await addSituationToCalendar(situationId);
    await situationTools.recordSituationEvent(situationId, "CALENDAR_EVENT_CREATED", `Google Calendar event ${eventId} created.`);
    return { eventId };
  });

  handle(IpcChannel.openSource, async (raw) => {
    const { sourceId } = OpenSourceRequest.parse(raw);
    const source = await getSourceById(sourceId);
    if (!source) throw new Error("Source not found.");
    if (source.sourceType === "gmail" && source.providerId) {
      await shell.openExternal(`https://mail.google.com/mail/u/0/#all/${source.providerId}`);
    } else if (source.sourceType === "document") {
      const originalPath = (source.metadata as { originalPath?: string })?.originalPath;
      if (originalPath && fs.existsSync(originalPath)) await shell.openPath(originalPath);
      else throw new Error("The original file could not be located on disk.");
    }
    return { opened: true };
  });

  handle(IpcChannel.getSettings, async () => getSettings());
  handle(IpcChannel.updateSettings, async (raw) => updateSettings(UpdateSettingsRequest.parse(raw)));
  handle(IpcChannel.completeOnboarding, async () => updateSettings({ onboardingComplete: true }));

  handle(IpcChannel.connectGmail, async () => connectGmail());
  handle(IpcChannel.disconnectGmail, async () => disconnectGmail());
  handle(IpcChannel.checkInboxNow, async () => checkInboxNow());
  handle(IpcChannel.getGmailStatus, async () => getGmailStatus());

  handle(IpcChannel.connectCalendar, async () => connectCalendar());
  handle(IpcChannel.disconnectCalendar, async () => disconnectCalendar());

  handle(IpcChannel.importDocument, async () => {
    const win = BrowserWindow.getFocusedWindow();
    const dialogOptions: Electron.OpenDialogOptions = {
      properties: ["openFile"],
      filters: [{ name: "Documents", extensions: ["pdf", "png", "jpg", "jpeg", "txt"] }],
    };
    const result = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);
    if (result.canceled || result.filePaths.length === 0) return { imported: false };
    const imported = await importDocument(result.filePaths[0]!);
    return { imported: true, ...imported };
  });

  handle(IpcChannel.setApiKey, async (raw) => {
    const { apiKey } = SetApiKeyRequest.parse(raw);
    setSecret(SecretKeys.openAiApiKey, apiKey);
    await updateSettings({ aiProvider: "openai" });
    return { saved: true };
  });

  handle(IpcChannel.clearApiKey, async () => {
    clearSecret(SecretKeys.openAiApiKey);
    await updateSettings({ aiProvider: "demo" });
    return { cleared: true };
  });

  handle(IpcChannel.getAiProviderStatus, async () => {
    const settings = await getSettings();
    return { provider: settings.aiProvider, hasApiKey: Boolean(getSecret(SecretKeys.openAiApiKey)) };
  });

  handle(IpcChannel.seedDemoData, async () => {
    await seedDemoData();
    return { seeded: true };
  });

  handle(IpcChannel.openExternal, async (raw) => {
    const { url } = OpenExternalRequest.parse(raw);
    await shell.openExternal(url);
    return { opened: true };
  });

  handle(IpcChannel.deleteAllData, async () => {
    closeDb();
    const dbPath = getDbPath();
    for (const suffix of ["", "-wal", "-shm"]) {
      const target = `${dbPath}${suffix}`;
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
    clearSecret(SecretKeys.gmailTokens);
    clearSecret(SecretKeys.calendarTokens);
    clearSecret(SecretKeys.openAiApiKey);
    return { deleted: true };
  });

  ipcMain.handle("clerk:listDocumentSources", async () => {
    try {
      return { ok: true, data: await listDocumentSources() };
    } catch (error) {
      return { ok: false, error: friendlyErrorMessage(error) };
    }
  });

  // Exposed for completeness; Actions/Waiting screens can filter dashboard
  // results client-side, but a direct status query keeps large datasets fast.
  ipcMain.handle("clerk:getSituationsByStatus", async (_e, status: string) => {
    try {
      return { ok: true, data: await getSituationsByStatus(status as never) };
    } catch (error) {
      return { ok: false, error: friendlyErrorMessage(error) };
    }
  });
}
