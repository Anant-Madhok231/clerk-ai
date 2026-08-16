import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { situation, situationEvent } from '../db/schema'

export class SituationNotFoundError extends Error {}

// just a flag the user sets themselves, doesn't touch status/priority at
// all - a WAITING item marked important is still WAITING, still shows up
// in Waiting, it also just shows up in Important now too
export function markSituationImportant(db: Db, situationId: string): void {
  const row = db.select({ id: situation.id }).from(situation).where(eq(situation.id, situationId)).get()
  if (!row) throw new SituationNotFoundError(`Situation ${situationId} not found.`)

  const now = new Date().toISOString()
  db.update(situation).set({ important: true, updatedAt: now }).where(eq(situation.id, situationId)).run()

  db.insert(situationEvent)
    .values({ id: randomUUID(), situationId, eventType: 'MARKED_IMPORTANT', occurredAt: now })
    .run()
}

export function unmarkSituationImportant(db: Db, situationId: string): void {
  const row = db.select({ id: situation.id }).from(situation).where(eq(situation.id, situationId)).get()
  if (!row) throw new SituationNotFoundError(`Situation ${situationId} not found.`)

  const now = new Date().toISOString()
  db.update(situation).set({ important: false, updatedAt: now }).where(eq(situation.id, situationId)).run()

  db.insert(situationEvent)
    .values({ id: randomUUID(), situationId, eventType: 'UNMARKED_IMPORTANT', occurredAt: now })
    .run()
}
