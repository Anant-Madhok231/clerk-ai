import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { situation, situationEvent } from '../../db/schema'
import { InvalidTransitionError, markSituationComplete } from '../markComplete'

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
})

function seed(current: ScratchDb, status: string) {
  const { db } = current
  const now = new Date().toISOString()
  const id = randomUUID()
  db.insert(situation)
    .values({ id, title: 'Test', summary: 'Test', status, priority: 'MEDIUM', confidence: 0.9, createdAt: now, updatedAt: now })
    .run()
  return id
}

describe('markSituationComplete', () => {
  it('marks a WAITING situation complete and logs the event', () => {
    current = createScratchDb()
    const id = seed(current, 'WAITING')

    markSituationComplete(current.db, id)

    const row = current.db.select().from(situation).where(eq(situation.id, id)).get()
    expect(row?.status).toBe('COMPLETED')
    expect(row?.userConfirmed).toBe(true)
    expect(row?.resolvedAt).not.toBeNull()

    const events = current.db.select().from(situationEvent).where(eq(situationEvent.situationId, id)).all()
    expect(events.map((e) => e.eventType)).toEqual(['MARKED_COMPLETE'])
  })

  it('refuses to re-mark an already-INFORMATIONAL situation', () => {
    current = createScratchDb()
    const id = seed(current, 'INFORMATIONAL')
    expect(() => markSituationComplete(current.db, id)).toThrow(InvalidTransitionError)
  })
})
