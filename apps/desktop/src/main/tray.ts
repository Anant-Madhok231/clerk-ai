import { app, Tray, Menu, nativeImage, type BrowserWindow } from "electron";
import path from "node:path";
import { getDashboard } from "./db/dashboardRepo.js";
import { checkInboxNow } from "./integrations/gmail.js";
import { getSettings, updateSettings } from "./db/settingsRepo.js";

let tray: Tray | null = null;

export async function createTray(getMainWindow: () => BrowserWindow | null, resourcesPath: string): Promise<Tray> {
  const iconPath = path.join(resourcesPath, process.platform === "darwin" ? "trayTemplate.png" : "tray.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  if (process.platform === "darwin") tray.setImage(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip("Clerk");

  await refreshTrayMenu(getMainWindow);
  return tray;
}

export async function refreshTrayMenu(getMainWindow: () => BrowserWindow | null): Promise<void> {
  if (!tray) return;
  const dashboard = await getDashboard();
  const settings = await getSettings();
  const needsAttention = dashboard.needsAttention.length;

  const menu = Menu.buildFromTemplate([
    { label: "Clerk", enabled: false },
    {
      label:
        needsAttention === 0
          ? "Nothing needs attention"
          : `${needsAttention} thing${needsAttention === 1 ? "" : "s"} need${needsAttention === 1 ? "s" : ""} attention`,
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Open Clerk",
      click: () => {
        const win = getMainWindow();
        if (win) {
          win.show();
          win.focus();
        }
      },
    },
    {
      label: "Check Inbox Now",
      click: async () => {
        try {
          await checkInboxNow();
        } catch {
          // Surfaced in the UI's Gmail status indicator, not here.
        }
        await refreshTrayMenu(getMainWindow);
      },
    },
    {
      label: settings.backgroundMonitoring ? "Pause Monitoring" : "Resume Monitoring",
      click: async () => {
        await updateSettings({ backgroundMonitoring: !settings.backgroundMonitoring });
        await refreshTrayMenu(getMainWindow);
      },
    },
    {
      label: "Settings",
      click: () => {
        const win = getMainWindow();
        if (win) {
          win.show();
          win.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit Clerk",
      click: () => {
        app.exit(0);
      },
    },
  ]);

  tray.setContextMenu(menu);
}
