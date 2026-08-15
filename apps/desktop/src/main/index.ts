import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import { initDatabase } from './db'
import { registerIpcHandlers } from './ipc/handlers'
import { createAIProvider } from './ai/createAIProvider'
import { GmailAdapter } from './integrations/gmail'

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(join(app.getAppPath(), '.env.local'))
  } catch {
    // No .env.local — expected until a Google OAuth client id is provisioned.
  }
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
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
}

app.whenReady().then(() => {
  loadLocalEnv()
  const db = initDatabase()
  // AI provider selection (demo vs. a user-supplied OpenAI key) becomes a
  // Settings-driven choice once that UI exists; Demo Mode is the only
  // provider wired up so far.
  const aiProvider = createAIProvider({ kind: 'demo' })
  const gmailAdapter = new GmailAdapter(db, { clientId: process.env['GMAIL_OAUTH_CLIENT_ID'] ?? '' })
  registerIpcHandlers({ db, aiProvider, gmailAdapter })
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
