import { randomUUID } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { situation, situationEvent, situationSource, sourceItem } from '../db/schema'
import { recordDismissalSignal } from '../settings/dismissalSignals'

export class SituationNotFoundError extends Error {}

// marks a situation as not needed/spam and remembers what it looked like
// so similar stuff gets auto-filed here too in the future
export function dismissSituation(db: Db, situationId: string): void {
  const row = db.select().from(situation).where(eq(situation.id, situationId)).get()
  if (!row) throw new SituationNotFoundError(`Situation ${situationId} not found.`)

  const now = new Date().toISOString()
  db.update(situation)
    .set({ dismissed: true, dismissalReason: 'user', updatedAt: now })
    .where(eq(situation.id, situationId))
    .run()

  db.insert(situationEvent)
    .values({ id: randomUUID(), situationId, eventType: 'DISMISSED', occurredAt: now })
    .run()

  const source = db
    .select({ sender: sourceItem.sender, subject: sourceItem.subject })
    .from(situationSource)
    .innerJoin(sourceItem, eq(situationSource.sourceItemId, sourceItem.id))
    .where(eq(situationSource.situationId, situationId))
    .orderBy(desc(sourceItem.receivedAt))
    .get()

  recordDismissalSignal(db, {
    sender: source?.sender ?? null,
    subject: source?.subject ?? null,
    sourceTitle: row.title
  })
}
