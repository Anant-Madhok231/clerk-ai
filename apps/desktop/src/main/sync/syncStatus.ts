import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { settings } from '../db/schema'
import { loadTokens as loadGmailTokens } from '../integrations/gmail/tokenStore'
import { loadTokens as loadCalendarTokens } from '../integrations/calendar/tokenStore'

const LAST_CHECKED_KEY = 'sync.lastCheckedAt'

// just in memory, resets on restart which is fine - "checking" isn't
// something worth saving, unlike lastCheckedAt
let checking = false

export interface SyncStatus {
  gmailConnected: boolean
  calendarConnected: boolean
  checking: boolean
  lastCheckedAt: string | null
}

export function getSyncStatus(db: Db): SyncStatus {
  const row = db.select().from(settings).where(eq(settings.key, LAST_CHECKED_KEY)).get()
  return {
    gmailConnected: loadGmailTokens(db) !== null,
    calendarConnected: loadCalendarTokens(db) !== null,
    checking,
    lastCheckedAt: row?.value ?? null
  }
}

export function setChecking(value: boolean): void {
  checking = value
}

export function recordCheckCompleted(db: Db): void {
  const now = new Date().toISOString()
  db.insert(settings)
    .values({ key: LAST_CHECKED_KEY, value: now, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: now, updatedAt: now } })
    .run()
}
