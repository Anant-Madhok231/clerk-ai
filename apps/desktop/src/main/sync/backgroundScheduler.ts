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

/** Re-reads the interval from settings on every tick, so a Settings change takes effect on the next cycle without an app restart. */
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
    // Background failures shouldn't crash the app — "Check Inbox Now"
    // surfaces the same error to the user on demand instead.
  }
}

export function stopBackgroundScheduler(): void {
  if (timer) clearTimeout(timer)
  timer = null
}
