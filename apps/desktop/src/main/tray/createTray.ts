import { app, Menu, Tray, nativeImage } from 'electron'
import { join } from 'node:path'
import type { Db } from '../db/client'
import { getAppSettings, updateAppSettings } from '../settings/appSettings'
import { listSituations } from '../situations/situationRepository'

export interface TrayDependencies {
  db: Db
  showWindow: () => void
  openSettings: () => void
  checkNow: () => Promise<void>
  quit: () => void
}

let tray: Tray | null = null

function trayIconPath(): string {
  // in a packaged build, electron-builder copies the resources folder over
  // via extraResources. in dev it's just the apps/desktop folder
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath()
  return join(base, 'resources/tray/trayIconTemplate.png')
}

function attentionSummary(db: Db): string {
  const situations = listSituations(db)
  const count = situations.filter(
    (s) => s.status === 'ACTION' && (s.priority === 'HIGH' || s.priority === 'URGENT')
  ).length
  if (count === 0) return "You're all caught up"
  return `${count} thing${count === 1 ? '' : 's'} need attention`
}

function buildMenu(deps: TrayDependencies): Menu {
  const settings = getAppSettings(deps.db)
  return Menu.buildFromTemplate([
    { label: attentionSummary(deps.db), enabled: false },
    { type: 'separator' },
    { label: 'Open Clerk', click: () => deps.showWindow() },
    { label: 'Check Inbox Now', click: () => void deps.checkNow() },
    {
      label: settings.backgroundMonitoringEnabled ? 'Pause Monitoring' : 'Resume Monitoring',
      click: () => {
        updateAppSettings(deps.db, { backgroundMonitoringEnabled: !settings.backgroundMonitoringEnabled })
        refreshTray(deps)
      }
    },
    { label: 'Settings', click: () => deps.openSettings() },
    { type: 'separator' },
    { label: 'Quit Clerk', click: () => deps.quit() }
  ])
}

export function createTray(deps: TrayDependencies): Tray {
  const icon = nativeImage.createFromPath(trayIconPath())
  tray = new Tray(icon)
  tray.setToolTip('Clerk')
  refreshTray(deps)
  return tray
}

export function refreshTray(deps: TrayDependencies): void {
  tray?.setContextMenu(buildMenu(deps))
}
