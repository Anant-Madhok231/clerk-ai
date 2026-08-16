import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { situation, situationEvent, situationSource, sourceItem } from '../../db/schema'
import { dismissSituation, SituationNotFoundError } from '../dismissSituation'
import { getDismissalSignals, matchesDismissalSignal } from '../../settings/dismissalSignals'

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
})

function seedSituationWithSource(current: ScratchDb) {
  const { db } = current
  const now = new Date().toISOString()
  const situationId = randomUUID()
  const sourceItemId = randomUUID()

  db.insert(situation)
    .values({
      id: situationId,
      title: 'Huge weekend clearance sale event',
      summary: 'Some marketing email.',
      status: 'INFORMATIONAL',
      priority: 'LOW',
      confidence: 0.6,
      createdAt: now,
      updatedAt: now
    })
    .run()

  db.insert(sourceItem)
    .values({
      id: sourceItemId,
      sourceType: 'demo',
      provider: 'demo',
      providerId: 'demo-marketing-1',
      sender: 'deals@retailer.com',
      subject: 'Huge weekend clearance sale event',
      snippet: 'Save big this weekend.',
      receivedAt: now,
      createdAt: now,
      updatedAt: now
    })
    .run()

  db.insert(situationSource)
    .values({ id: randomUUID(), situationId, sourceItemId, role: 'origin', linkedAt: now })
    .run()

  return situationId
}

describe('dismissSituation', () => {
  it('marks the situation dismissed with reason user and logs the event', () => {
    current = createScratchDb()
    const id = seedSituationWithSource(current)

    dismissSituation(current.db, id)

    const row = current.db.select().from(situation).where(eq(situation.id, id)).get()
    expect(row?.dismissed).toBe(true)
    expect(row?.dismissalReason).toBe('user')

    const events = current.db.select().from(situationEvent).where(eq(situationEvent.situationId, id)).all()
    expect(events.map((e) => e.eventType)).toEqual(['DISMISSED'])
  })

  it('records a dismissal signal that future similar mail will match', () => {
    current = createScratchDb()
    const id = seedSituationWithSource(current)

    dismissSituation(current.db, id)

    const signals = getDismissalSignals(current.db)
    expect(signals).toHaveLength(1)
    expect(signals[0]?.sender).toBe('deals@retailer.com')

    expect(
      matchesDismissalSignal(current.db, { sender: 'deals@retailer.com', subject: 'anything' })
    ).toBe(true)
  })

  it('throws for a situation that does not exist', () => {
    current = createScratchDb()
    expect(() => dismissSituation(current.db, 'nope')).toThrow(SituationNotFoundError)
  })
})
