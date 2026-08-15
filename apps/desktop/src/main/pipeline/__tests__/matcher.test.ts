import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { situation, situationSource, sourceItem } from '../../db/schema'
import { findCandidateSituations } from '../matcher'

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
})

function seedSituationOnThread(current: ScratchDb, threadId: string) {
  const { db } = current
  const now = new Date().toISOString()
  const situationId = randomUUID()
  const sourceItemId = randomUUID()

  db.insert(sourceItem)
    .values({
      id: sourceItemId,
      sourceType: 'demo',
      provider: 'demo',
      providerId: `demo-${sourceItemId}`,
      threadId,
      receivedAt: now,
      createdAt: now,
      updatedAt: now
    })
    .run()

  db.insert(situation)
    .values({
      id: situationId,
      title: 'Amazon Refund',
      summary: 'Refund requested.',
      status: 'WAITING',
      priority: 'MEDIUM',
      confidence: 0.9,
      createdAt: now,
      updatedAt: now
    })
    .run()

  db.insert(situationSource)
    .values({ id: randomUUID(), situationId, sourceItemId, role: 'origin', linkedAt: now })
    .run()

  return situationId
}

describe('findCandidateSituations', () => {
  it('returns nothing when there is no thread id', () => {
    current = createScratchDb()
    expect(findCandidateSituations(current.db, null)).toEqual([])
  })

  it('returns nothing when no situation shares the thread', () => {
    current = createScratchDb()
    expect(findCandidateSituations(current.db, 'unseen-thread')).toEqual([])
  })

  it('finds a situation linked to a source item on the same thread', () => {
    current = createScratchDb()
    const situationId = seedSituationOnThread(current, 'demo-thread-amazon-refund')

    const candidates = findCandidateSituations(current.db, 'demo-thread-amazon-refund')
    expect(candidates).toEqual([{ id: situationId, title: 'Amazon Refund', status: 'WAITING' }])
  })
})
