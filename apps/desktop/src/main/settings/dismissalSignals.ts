import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db/client'
import { settings } from '../db/schema'
import { extractEmailAddress } from './trackedSenders'

export const DismissalSignalSchema = z.object({
  id: z.string(),
  sender: z.string().nullable(),
  keywords: z.array(z.string()),
  sourceTitle: z.string(),
  createdAt: z.string()
})
export type DismissalSignal = z.infer<typeof DismissalSignalSchema>

const DISMISSAL_SIGNALS_KEY = 'gmail.dismissalSignals'
const MAX_SIGNALS = 200

// common words that don't say anything about what the email's actually about
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'from', 'your', 'you', 'this', 'that',
  'have', 'has', 'had', 'are', 'was', 'were', 'been', 'will', 'would', 'could', 'should',
  'about', 'into', 'over', 'under', 'than', 'then', 'just', 'only', 'also', 'more', 'most',
  'some', 'such', 'not', 'now', 'out', 'off', 'can', 'get', 'got', 'new', 'all', 'one', 'two',
  'please', 'thanks', 'thank', 'regarding', 'update', 'updates', 'here', 'there', 'what',
  'when', 'where', 'which', 'who', 'how', 'why', 'our', 'their', 'its'
])

// grabs the meaningful words out of a subject line, lowercase, no
// stopwords, no tiny junk words
function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 4 && !STOPWORDS.has(word))
    )
  )
}

export function getDismissalSignals(db: Db): DismissalSignal[] {
  const row = db.select().from(settings).where(eq(settings.key, DISMISSAL_SIGNALS_KEY)).get()
  if (!row) return []
  const parsed = z.array(DismissalSignalSchema).safeParse(JSON.parse(row.value))
  return parsed.success ? parsed.data : []
}

function saveDismissalSignals(db: Db, list: DismissalSignal[]): void {
  const now = new Date().toISOString()
  db.insert(settings)
    .values({ key: DISMISSAL_SIGNALS_KEY, value: JSON.stringify(list), updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(list), updatedAt: now } })
    .run()
}

// remembers what a dismissed item looked like so similar future mail can
// get auto-filed too. caps the list so it can't grow forever
export function recordDismissalSignal(
  db: Db,
  input: { sender: string | null; subject: string | null; sourceTitle: string }
): void {
  const keywords = extractKeywords(input.subject ?? input.sourceTitle)
  const senderEmail = input.sender ? extractEmailAddress(input.sender) : null
  if (keywords.length === 0 && !senderEmail) return

  const entry: DismissalSignal = {
    id: randomUUID(),
    sender: senderEmail,
    keywords,
    sourceTitle: input.sourceTitle,
    createdAt: new Date().toISOString()
  }
  const list = [...getDismissalSignals(db), entry].slice(-MAX_SIGNALS)
  saveDismissalSignals(db, list)
}

// checks if a new item looks like something already dismissed before -
// matches on exact sender, or on sharing enough of the same subject words
export function matchesDismissalSignal(
  db: Db,
  input: { sender: string | null; subject: string | null }
): boolean {
  const senderEmail = input.sender ? extractEmailAddress(input.sender) : null
  const keywords = extractKeywords(input.subject ?? '')
  if (!senderEmail && keywords.length === 0) return false

  const signals = getDismissalSignals(db)
  return signals.some((signal) => {
    if (senderEmail && signal.sender && senderEmail === signal.sender) return true
    if (signal.keywords.length === 0 || keywords.length === 0) return false
    const shared = signal.keywords.filter((word) => keywords.includes(word))
    // needs at least 2 shared words and at least half of the stored signal's words
    return shared.length >= 2 && shared.length / signal.keywords.length >= 0.5
  })
}
