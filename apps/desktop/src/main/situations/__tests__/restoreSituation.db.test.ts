import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { situation, situationEvent } from '../../db/schema'
import { restoreSituation, SituationNotFoundError } from '../restoreSituation'

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
})

function seedDismissed(current: ScratchDb) {
  const { db } = current
  const now = new Date().toISOString()
  const id = randomUUID()
  db.insert(situation)
    .values({
      id,
      title: 'Test',
      summary: 'Test',
      status: 'INFORMATIONAL',
      priority: 'LOW',
      confidence: 0.6,
      dismissed: true,
      dismissalReason: 'auto-similar',
      createdAt: now,
      updatedAt: now
    })
    .run()
  return id
}

describe('restoreSituation', () => {
  it('clears dismissed and dismissalReason, logs the event', () => {
    current = createScratchDb()
    const id = seedDismissed(current)

    restoreSituation(current.db, id)

    const row = current.db.select().from(situation).where(eq(situation.id, id)).get()
    expect(row?.dismissed).toBe(false)
    expect(row?.dismissalReason).toBeNull()

    const events = current.db.select().from(situationEvent).where(eq(situationEvent.situationId, id)).all()
    expect(events.map((e) => e.eventType)).toEqual(['RESTORED'])
  })

  it('throws for a situation that does not exist', () => {
    current = createScratchDb()
    expect(() => restoreSituation(current.db, 'nope')).toThrow(SituationNotFoundError)
  })
})
