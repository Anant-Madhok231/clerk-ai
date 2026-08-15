import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import { initDatabase } from './db'
import { registerIpcHandlers } from './ipc/handlers'
import { createAIProvider, type AIProviderConfig } from './ai/createAIProvider'
import { loadOpenAIApiKey } from './ai/apiKeyStore'
import { getAppSettings } from './settings/appSettings'
import { GmailAdapter } from './integrations/gmail'
import { CalendarAdapter } from './integrations/calendar'
import { registerMainWindow } from './events/broadcast'
import type { Db } from './db/client'

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(join(app.getAppPath(), '.env.local'))
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

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 880,
    minHeight: 600,
    show: false,
    backgroundColor: '#f6f5f2',
    title: 'Clerk',
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
  const gmailAdapter = new GmailAdapter(db, { clientId: googleClientId })
  const calendarAdapter = new CalendarAdapter(db, { clientId: googleClientId })
  registerIpcHandlers({ db, aiProvider, gmailAdapter, calendarAdapter })

  const window = createWindow()
  registerMainWindow(window)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      registerMainWindow(createWindow())
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
