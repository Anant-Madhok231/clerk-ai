import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc/handlers.js";
import { createTray, refreshTrayMenu } from "./tray.js";
import { getSettings } from "./db/settingsRepo.js";
import { checkInboxNow } from "./integrations/gmail.js";
import { getGmailStatus } from "./integrations/gmail.js";
import { closeDb } from "./db/client.js";
import { seedDemoData } from "./db/seedDemo.js";
import { getDashboard } from "./db/dashboardRepo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

// Keeps the userData directory ("Clerk") stable across dev/prod, instead of
// falling back to Electron's binary name when no packaged app metadata is present.
app.setName("Clerk");

let mainWindow: BrowserWindow | null = null;
let backgroundSyncTimer: NodeJS.Timeout | null = null;
let isQuitting = false;

function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    title: "Clerk",
    icon: path.join(__dirname, "../../resources/icon.png"),
    backgroundColor: "#faf9f7",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  // Every external navigation (Gmail links, docs, GitHub) opens in the
  // user's normal browser rather than inside the app shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://") && !isDev) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("close", (event) => {
    if (process.platform !== "darwin" && !isQuitting) {
      // Hide to tray instead of quitting so background monitoring continues.
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

async function startBackgroundSync(): Promise<void> {
  if (backgroundSyncTimer) clearInterval(backgroundSyncTimer);

  const tick = async () => {
    const settings = await getSettings();
    if (!settings.backgroundMonitoring) return;
    const status = await getGmailStatus();
    if (!status.connected) return;
    try {
      await checkInboxNow();
    } catch {
      // Connection errors surface through the Gmail status indicator in Settings.
    } finally {
      await refreshTrayMenu(getMainWindow);
      mainWindow?.webContents.send("clerk:dashboardUpdated");
    }
  };

  const settings = await getSettings();
  backgroundSyncTimer = setInterval(tick, settings.scanIntervalMinutes * 60 * 1000);
}

app.on("before-quit", () => {
  isQuitting = true;
});

app.whenReady().then(async () => {
  registerIpcHandlers();

  // Headless verification path used by scripts/smoke-test.mjs and CI: seeds
  // Demo Mode data through the real pipeline/DB layer and prints a summary,
  // without needing a display or driving the renderer over CDP.
  if (process.env.CLERK_SMOKE_TEST === "1") {
    await seedDemoData();
    const dashboard = await getDashboard();
    console.log(
      JSON.stringify({
        needsAttention: dashboard.needsAttention.length,
        upcoming: dashboard.upcoming.length,
        waiting: dashboard.waiting.length,
        recentlyCompleted: dashboard.recentlyCompleted.length,
        sample: dashboard.needsAttention[0]?.title ?? null,
      })
    );
    closeDb();
    app.exit(0);
    return;
  }

  createMainWindow();
  await createTray(getMainWindow, path.join(__dirname, "../../resources"));
  await startBackgroundSync();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else mainWindow?.show();
  });
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") return;
  // On Windows/Linux the window hides to tray (see the 'close' handler
  // above); this only fires if every window was destroyed outright.
});

app.on("will-quit", () => {
  if (backgroundSyncTimer) clearInterval(backgroundSyncTimer);
  closeDb();
});
