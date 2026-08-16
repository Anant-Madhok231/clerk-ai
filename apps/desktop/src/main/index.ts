import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import { initDatabase } from './db'
import { registerIpcHandlers } from './ipc/handlers'
import { createAIProvider, type AIProviderConfig } from './ai/createAIProvider'
import { loadOpenAIApiKey } from './ai/apiKeyStore'
import { getAppSettings } from './settings/appSettings'
import { GmailAdapter } from './integrations/gmail'
import { CalendarAdapter } from './integrations/calendar'
import { broadcastNavigateToSettings, registerChangeListener, registerMainWindow } from './events/broadcast'
import { createTray, refreshTray, type TrayDependencies } from './tray/createTray'
import { checkGmailNow } from './sync/checkNow'
import { startBackgroundScheduler } from './sync/backgroundScheduler'
import { deleteDemoSituationData } from './situations/deleteDemoData'
import { runGmailBootstrapIfNeeded } from './sync/gmailBootstrap'
import type { Db } from './db/client'

function loadLocalEnv(): void {
  try {
    // Not process.loadEnvFile: its native implementation reads straight off
    // disk and doesn't go through Electron's asar-patched fs, so it silently
    // fails to find this file once it's packaged inside app.asar. Plain
    // fs.readFileSync does go through that patch, in dev and packaged alike.
    const raw = readFileSync(join(app.getAppPath(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim())
      const key = match?.[1]
      const value = match?.[2]
      if (key !== undefined && value !== undefined) process.env[key] = value
    }
  } catch {
    // No .env.local — expected until a Google OAuth client id is provisioned.
  }
}

function resolveAIProvider(db: Db) {
  const settings = getAppSettings(db)
  const config: AIProviderConfig =
    settings.aiProviderKind === 'openai'
      ? (() => {
          const apiKey = loadOpenAIApiKey(db)
          // Fall back to Demo Mode rather than constructing a provider that
          // will fail on first use — Settings surfaces "not configured".
          return apiKey ? { kind: 'openai' as const, apiKey } : { kind: 'demo' as const }
        })()
      : { kind: 'demo' }
  return createAIProvider(config)
}

function windowIconPath(): string {
  // Ignored on macOS (the .app bundle icon from build/icon.icns is what's
  // shown); used for the Windows/Linux taskbar icon.
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath()
  return join(base, 'build/icons/256x256.png')
}

let isQuitting = false

function createWindow(db: Db): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 880,
    minHeight: 600,
    show: false,
    backgroundColor: '#f6f5f2',
    title: 'Clerk',
    icon: windowIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Every external link/popup opens in the user's real browser, never inside Clerk.
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // With background monitoring on, closing the window hides Clerk (it keeps
  // syncing from the tray) rather than quitting — "Quit Clerk" in the tray
  // menu is the explicit way out.
  window.on('close', (event) => {
    if (isQuitting) return
    if (getAppSettings(db).backgroundMonitoringEnabled) {
      event.preventDefault()
      window.hide()
    }
  })

  window.once('ready-to-show', () => window.show())

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (devServerUrl) {
    window.loadURL(devServerUrl)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

app.whenReady().then(() => {
  loadLocalEnv()
  const db = initDatabase()
  const aiProvider = resolveAIProvider(db)
  const googleClientId = process.env['GOOGLE_OAUTH_CLIENT_ID'] ?? ''
  const googleClientSecret = process.env['GOOGLE_OAUTH_CLIENT_SECRET'] ?? ''
  const gmailAdapter = new GmailAdapter(db, { clientId: googleClientId, clientSecret: googleClientSecret })
  const calendarAdapter = new CalendarAdapter(db, { clientId: googleClientId, clientSecret: googleClientSecret })
  registerIpcHandlers({ db, aiProvider, gmailAdapter, calendarAdapter })

  // Self-heals installs that connected a real account before demo-fixture
  // auto-cleanup existed on the connect handlers themselves.
  if (gmailAdapter.isConnected() || calendarAdapter.isConnected()) {
    deleteDemoSituationData(db)
  }

  // Covers installs that connected Gmail before the 10-day backfill existed
  // -- runs once, self-terminates via the completion marker, no
  // disconnect/reconnect required. Fire-and-forget: must not block startup.
  void runGmailBootstrapIfNeeded({ db, aiProvider, gmailAdapter })

  let window = createWindow(db)
  registerMainWindow(window)

  function showWindow(): void {
    if (window.isDestroyed()) {
      window = createWindow(db)
      registerMainWindow(window)
    }
    window.show()
    window.focus()
  }

  const trayDeps: TrayDependencies = {
    db,
    showWindow,
    openSettings: () => {
      showWindow()
      broadcastNavigateToSettings()
    },
    checkNow: async () => {
      await checkGmailNow({ db, aiProvider, gmailAdapter })
    },
    quit: () => {
      isQuitting = true
      app.quit()
    }
  }
  createTray(trayDeps)
  registerChangeListener(() => refreshTray(trayDeps))

  startBackgroundScheduler({ db, aiProvider, gmailAdapter })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      window = createWindow(db)
      registerMainWindow(window)
    } else {
      showWindow()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
