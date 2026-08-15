import type { BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

export function registerMainWindow(window: BrowserWindow): void {
  mainWindow = window
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })
}

/** Fired after any DB mutation that could change what Home/Actions/Waiting/History/detail views show — the one push signal every view invalidates on. */
export function broadcastSituationsChanged(): void {
  mainWindow?.webContents.send('clerk:situationsChanged')
}

/** Fired when Gmail/Calendar connection or last-checked state changes. */
export function broadcastSyncStatusChanged(): void {
  mainWindow?.webContents.send('clerk:syncStatusChanged')
}
