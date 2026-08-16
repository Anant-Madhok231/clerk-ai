import type { Db } from '../db/client'
import type { AIProvider } from '../ai/AIProvider'
import type { GmailAdapter } from '../integrations/gmail'
import { getAppSettings } from '../settings/appSettings'
import { notifyUpcomingDeadlines } from '../notifications/notifyForResults'
import { checkGmailNow } from './checkNow'

let timer: NodeJS.Timeout | null = null

export interface SchedulerDependencies {
  db: Db
  aiProvider: AIProvider
  gmailAdapter: GmailAdapter
}

/** re-checks the interval from settings every tick so changing it in settings works right away, no restart needed */
export function startBackgroundScheduler(deps: SchedulerDependencies): void {
  stopBackgroundScheduler()
  scheduleNext(deps)
}

function scheduleNext(deps: SchedulerDependencies): void {
  const settings = getAppSettings(deps.db)
  const intervalMs = settings.syncIntervalMinutes * 60_000
  timer = setTimeout(() => {
    void runTick(deps).finally(() => scheduleNext(deps))
  }, intervalMs)
}

export async function runTick(deps: SchedulerDependencies): Promise<void> {
  const settings = getAppSettings(deps.db)
  if (!settings.backgroundMonitoringEnabled) return

  if (!deps.gmailAdapter.isConnected()) {
    notifyUpcomingDeadlines(deps.db, settings)
    return
  }

  try {
    await checkGmailNow(deps)
  } catch {
    // don't crash the app over a background failure, "check inbox now"
    // will show the same error if the user triggers it manually
  }
}

export function stopBackgroundScheduler(): void {
  if (timer) clearTimeout(timer)
  timer = null
}
