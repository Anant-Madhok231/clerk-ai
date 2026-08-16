import type { BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null
let onChangeExtra: (() => void) | null = null

export function registerMainWindow(window: BrowserWindow): void {
  mainWindow = window
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })
}

/** without this the tray menu's counts go stale, registered once at startup with createTray() */
export function registerChangeListener(callback: () => void): void {
  onChangeExtra = callback
}

/** fires after any db change that could affect what the views show, this is the one signal every screen listens for */
export function broadcastSituationsChanged(): void {
  mainWindow?.webContents.send('clerk:situationsChanged')
  onChangeExtra?.()
}

/** fires when gmail/calendar connection or last-checked state changes */
export function broadcastSyncStatusChanged(): void {
  mainWindow?.webContents.send('clerk:syncStatusChanged')
  onChangeExtra?.()
}

/** fires when "settings" is clicked in the tray, brings the window forward and switches the view in one go */
export function broadcastNavigateToSettings(): void {
  mainWindow?.webContents.send('clerk:navigateToSettings')
}
