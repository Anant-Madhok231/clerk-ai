import type { BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null
let onChangeExtra: (() => void) | null = null

export function registerMainWindow(window: BrowserWindow): void {
  mainWindow = window
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })
}

/** The tray menu's counts/labels go stale without this — registered once at startup alongside createTray(). */
export function registerChangeListener(callback: () => void): void {
  onChangeExtra = callback
}

/** Fired after any DB mutation that could change what Home/Actions/Waiting/History/detail views show — the one push signal every view invalidates on. */
export function broadcastSituationsChanged(): void {
  mainWindow?.webContents.send('clerk:situationsChanged')
  onChangeExtra?.()
}

/** Fired when Gmail/Calendar connection or last-checked state changes. */
export function broadcastSyncStatusChanged(): void {
  mainWindow?.webContents.send('clerk:syncStatusChanged')
  onChangeExtra?.()
}

/** Fired when the tray's "Settings" item is clicked — brings the window forward and switches its view in one step. */
export function broadcastNavigateToSettings(): void {
  mainWindow?.webContents.send('clerk:navigateToSettings')
}
