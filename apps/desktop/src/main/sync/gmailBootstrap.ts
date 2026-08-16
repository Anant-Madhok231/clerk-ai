import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { settings } from '../db/schema'
import type { AIProvider } from '../ai/AIProvider'
import type { GmailAdapter } from '../integrations/gmail'
import { getAppSettings } from '../settings/appSettings'
import { notifyForResults, notifyUpcomingDeadlines } from '../notifications/notifyForResults'
import { broadcastSituationsChanged, broadcastSyncStatusChanged } from '../events/broadcast'
import { recordCheckCompleted, setChecking } from './syncStatus'

const BOOTSTRAP_KEY = 'gmail.bootstrapCompletedAt'

export function isGmailBootstrapCompleted(db: Db): boolean {
  return db.select().from(settings).where(eq(settings.key, BOOTSTRAP_KEY)).get() !== undefined
}

export function markGmailBootstrapCompleted(db: Db): void {
  const now = new Date().toISOString()
  db.insert(settings)
    .values({ key: BOOTSTRAP_KEY, value: now, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: now, updatedAt: now } })
    .run()
}

export interface GmailBootstrapDependencies {
  db: Db
  aiProvider: AIProvider
  gmailAdapter: GmailAdapter
}

/**
 * runs the one-time 10 day backfill if it hasn't happened yet, whether
 * that's a fresh gmail connect or an old install that connected before
 * this existed. safe to call every startup and after every connect, it's
 * a no-op once done and dedupe means it can't double anything up anyway
 */
export async function runGmailBootstrapIfNeeded(deps: GmailBootstrapDependencies): Promise<void> {
  if (!deps.gmailAdapter.isConnected()) return
  if (isGmailBootstrapCompleted(deps.db)) return

  setChecking(true)
  broadcastSyncStatusChanged()
  try {
    const results = await deps.gmailAdapter.bootstrapSync(deps.aiProvider)
    markGmailBootstrapCompleted(deps.db)
    recordCheckCompleted(deps.db)
    if (results.length > 0) broadcastSituationsChanged()
    const settings = getAppSettings(deps.db)
    notifyForResults(deps.db, settings, results)
    notifyUpcomingDeadlines(deps.db, settings)
  } finally {
    setChecking(false)
    broadcastSyncStatusChanged()
  }
}
