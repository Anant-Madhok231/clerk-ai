import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { situation, situationEvent } from '../../db/schema'
import { markSituationImportant, SituationNotFoundError, unmarkSituationImportant } from '../markImportant'

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
})

function seed(current: ScratchDb, status = 'WAITING') {
  const { db } = current
  const now = new Date().toISOString()
  const id = randomUUID()
  db.insert(situation)
    .values({ id, title: 'Test', summary: 'Test', status, priority: 'MEDIUM', confidence: 0.9, createdAt: now, updatedAt: now })
    .run()
  return id
}

describe('markSituationImportant / unmarkSituationImportant', () => {
  it('marks a situation important without touching its status', () => {
    current = createScratchDb()
    const id = seed(current, 'WAITING')

    markSituationImportant(current.db, id)

    const row = current.db.select().from(situation).where(eq(situation.id, id)).get()
    expect(row?.important).toBe(true)
    expect(row?.status).toBe('WAITING')

    const events = current.db.select().from(situationEvent).where(eq(situationEvent.situationId, id)).all()
    expect(events.map((e) => e.eventType)).toEqual(['MARKED_IMPORTANT'])
  })

  it('unmarks it again', () => {
    current = createScratchDb()
    const id = seed(current)
    markSituationImportant(current.db, id)

    unmarkSituationImportant(current.db, id)

    const row = current.db.select().from(situation).where(eq(situation.id, id)).get()
    expect(row?.important).toBe(false)
  })

  it('throws for a situation that does not exist', () => {
    current = createScratchDb()
    expect(() => markSituationImportant(current.db, 'nope')).toThrow(SituationNotFoundError)
    expect(() => unmarkSituationImportant(current.db, 'nope')).toThrow(SituationNotFoundError)
  })
})
