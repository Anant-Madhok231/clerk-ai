import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { situation, situationEvent, situationSource } from '../../db/schema'
import { DemoAIProvider } from '../../ai/DemoAIProvider'
import { processSourceItem } from '../processSourceItem'
import { dismissSituation } from '../../situations/dismissSituation'

let current: ScratchDb
const provider = new DemoAIProvider()

afterEach(() => {
  current?.cleanup()
})

describe('processSourceItem', () => {
  it('creates a new ACTION situation from a bill with an amount and deadline', async () => {
    current = createScratchDb()
    const result = await processSourceItem(current.db, provider, {
      sourceType: 'demo',
      provider: 'demo',
      providerId: 'demo-rent-reminder',
      sender: 'Identity Apartments',
      subject: 'August rent reminder',
      snippet: 'Your rent of $1,850 must be paid by August 15, 2026.',
      receivedAt: '2026-08-13T09:00:00.000Z'
    })
    expect(result.outcome).toBe('created')
    if (result.outcome === 'created') {
      expect(result.status).toBe('ACTION')
    }
  })

  it('is idempotent on the same provider/providerId', async () => {
    current = createScratchDb()
    const input = {
      sourceType: 'demo',
      provider: 'demo',
      providerId: 'demo-rent-reminder',
      sender: 'Identity Apartments',
      subject: 'August rent reminder',
      snippet: 'Your rent of $1,850 must be paid by August 15, 2026.',
      receivedAt: '2026-08-13T09:00:00.000Z'
    }
    const first = await processSourceItem(current.db, provider, input)
    const second = await processSourceItem(current.db, provider, input)
    expect(first.outcome).toBe('created')
    expect(second.outcome).toBe('skipped-duplicate')
  })

  it('reconciles a WAITING situation to COMPLETED via the same thread — the flagship scenario', async () => {
    current = createScratchDb()
    const { db } = current

    const requested = await processSourceItem(db, provider, {
      sourceType: 'demo',
      provider: 'demo',
      providerId: 'demo-amazon-refund-requested',
      threadId: 'demo-thread-amazon-refund',
      sender: 'Amazon',
      subject: 'Your refund request has been received',
      snippet:
        "We've received your refund request for order #12345 ($129.99) and will contact you when processing is complete.",
      receivedAt: '2026-08-10T09:00:00.000Z'
    })
    expect(requested.outcome).toBe('created')
    if (requested.outcome !== 'created') throw new Error('unreachable')
    expect(requested.status).toBe('WAITING')

    const processed = await processSourceItem(db, provider, {
      sourceType: 'demo',
      provider: 'demo',
      providerId: 'demo-amazon-refund-processed',
      threadId: 'demo-thread-amazon-refund',
      sender: 'Amazon',
      subject: 'Re: Your refund request has been received',
      snippet: 'Your refund of $129.99 for order #12345 has been processed.',
      receivedAt: '2026-08-15T09:00:00.000Z'
    })

    // Same situation id, not a new one — this is the "don't duplicate,
    // update" behavior the whole matching system exists for.
    expect(processed.outcome).toBe('updated')
    if (processed.outcome !== 'updated') throw new Error('unreachable')
    expect(processed.situationId).toBe(requested.situationId)
    expect(processed.status).toBe('COMPLETED')
    expect(processed.transitioned).toBe(true)

    const links = db
      .select()
      .from(situationSource)
      .where(eq(situationSource.situationId, requested.situationId))
      .all()
    expect(links).toHaveLength(2)

    const events = db
      .select()
      .from(situationEvent)
      .where(eq(situationEvent.situationId, requested.situationId))
      .all()
    expect(events.map((e) => e.eventType)).toEqual(['CREATED', 'STATE_CHANGED'])
    const stateChange = events.find((e) => e.eventType === 'STATE_CHANGED')
    expect(stateChange?.fromStatus).toBe('WAITING')
    expect(stateChange?.toStatus).toBe('COMPLETED')
  })

  it('auto-files similar mail as dismissed after the user dismisses one like it', async () => {
    current = createScratchDb()
    const { db } = current

    const first = await processSourceItem(db, provider, {
      sourceType: 'demo',
      provider: 'demo',
      providerId: 'demo-marketing-1',
      sender: 'deals@retailer.com',
      subject: 'Huge weekend clearance sale event',
      snippet: 'Save big this weekend.',
      receivedAt: '2026-08-10T09:00:00.000Z'
    })
    expect(first.outcome).toBe('created')
    if (first.outcome !== 'created') throw new Error('unreachable')

    dismissSituation(db, first.situationId)

    const second = await processSourceItem(db, provider, {
      sourceType: 'demo',
      provider: 'demo',
      providerId: 'demo-marketing-2',
      sender: 'deals@retailer.com',
      subject: 'Weekend clearance sale starts now',
      snippet: "Don't miss out.",
      receivedAt: '2026-08-12T09:00:00.000Z'
    })
    expect(second.outcome).toBe('created')
    if (second.outcome !== 'created') throw new Error('unreachable')

    const row = db.select().from(situation).where(eq(situation.id, second.situationId)).get()
    expect(row?.dismissed).toBe(true)
    expect(row?.dismissalReason).toBe('auto-similar')

    const events = db.select().from(situationEvent).where(eq(situationEvent.situationId, second.situationId)).all()
    expect(events.map((e) => e.eventType)).toEqual(['AUTO_DISMISSED'])
  })
})
