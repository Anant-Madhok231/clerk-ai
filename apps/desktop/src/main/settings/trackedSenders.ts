import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db/client'
import { settings } from '../db/schema'

export const TrackedSenderSchema = z.object({
  id: z.string(),
  matchType: z.enum(['EXACT_EMAIL', 'DOMAIN']),
  /** lowercase email for EXACT_EMAIL, or just the domain with no @ for DOMAIN */
  value: z.string(),
  displayName: z.string()
})
export type TrackedSender = z.infer<typeof TrackedSenderSchema>

const TRACKED_SENDERS_KEY = 'gmail.trackedSenders'

export function getTrackedSenders(db: Db): TrackedSender[] {
  const row = db.select().from(settings).where(eq(settings.key, TRACKED_SENDERS_KEY)).get()
  if (!row) return []
  const parsed = z.array(TrackedSenderSchema).safeParse(JSON.parse(row.value))
  return parsed.success ? parsed.data : []
}

function saveTrackedSenders(db: Db, list: TrackedSender[]): void {
  const now = new Date().toISOString()
  db.insert(settings)
    .values({ key: TRACKED_SENDERS_KEY, value: JSON.stringify(list), updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(list), updatedAt: now } })
    .run()
}

/** EXACT_EMAIL wants a full address, DOMAIN wants just the domain no @ (like "company.com" not "@company.com", and "fakecompany.com" shouldn't match "company.com") */
export function addTrackedSender(
  db: Db,
  input: { matchType: 'EXACT_EMAIL' | 'DOMAIN'; value: string; displayName: string }
): TrackedSender[] {
  const list = getTrackedSenders(db)
  const entry: TrackedSender = {
    id: randomUUID(),
    matchType: input.matchType,
    value: input.value.trim().toLowerCase().replace(/^@/, ''),
    displayName: input.displayName.trim() || input.value
  }
  saveTrackedSenders(db, [...list, entry])
  return getTrackedSenders(db)
}

export function removeTrackedSender(db: Db, id: string): TrackedSender[] {
  const list = getTrackedSenders(db).filter((entry) => entry.id !== id)
  saveTrackedSenders(db, list)
  return list
}

/** pulls the plain email out of a "Name <addr@host>" or just "addr@host" string */
export function extractEmailAddress(sender: string): string | null {
  const match = /<([^>]+)>/.exec(sender) ?? [null, sender]
  const candidate = match[1]?.trim().toLowerCase()
  return candidate && candidate.includes('@') ? candidate : null
}

export function isTrackedSender(db: Db, sender: string | null | undefined): boolean {
  if (!sender) return false
  const email = extractEmailAddress(sender)
  if (!email) return false
  const domain = email.split('@')[1]
  const list = getTrackedSenders(db)
  return list.some((entry) =>
    entry.matchType === 'EXACT_EMAIL' ? entry.value === email : domain === entry.value
  )
}
