import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { canTransition, type SituationStatus } from '@shared/domain/situation'
import type { Db } from '../db/client'
import { situation, situationEvent } from '../db/schema'

export class InvalidTransitionError extends Error {}
export class SituationNotFoundError extends Error {}

/** The user's own "Mark Complete" override — goes through the same state-machine guard as automatic reconciliation, so a COMPLETED/INFORMATIONAL situation can't be re-flipped by mistake. */
export function markSituationComplete(db: Db, situationId: string): void {
  const row = db.select().from(situation).where(eq(situation.id, situationId)).get()
  if (!row) throw new SituationNotFoundError(`Situation ${situationId} not found.`)

  const currentStatus = row.status as SituationStatus
  if (!canTransition(currentStatus, 'COMPLETED')) {
    throw new InvalidTransitionError(`Cannot mark a ${currentStatus} situation complete.`)
  }

  const now = new Date().toISOString()
  db.update(situation)
    .set({ status: 'COMPLETED', userConfirmed: true, updatedAt: now, resolvedAt: now })
    .where(eq(situation.id, situationId))
    .run()

  db.insert(situationEvent)
    .values({
      id: randomUUID(),
      situationId,
      eventType: 'MARKED_COMPLETE',
      fromStatus: currentStatus,
      toStatus: 'COMPLETED',
      occurredAt: now
    })
    .run()
}
