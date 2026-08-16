import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { situation, situationEvent } from '../db/schema'

export class SituationNotFoundError extends Error {}

// undoes a dismiss, situation goes back to showing under its normal status.
// doesn't touch the learned dismissal signals, just this one situation
export function restoreSituation(db: Db, situationId: string): void {
  const row = db.select().from(situation).where(eq(situation.id, situationId)).get()
  if (!row) throw new SituationNotFoundError(`Situation ${situationId} not found.`)

  const now = new Date().toISOString()
  db.update(situation)
    .set({ dismissed: false, dismissalReason: null, updatedAt: now })
    .where(eq(situation.id, situationId))
    .run()

  db.insert(situationEvent)
    .values({ id: randomUUID(), situationId, eventType: 'RESTORED', occurredAt: now })
    .run()
}
