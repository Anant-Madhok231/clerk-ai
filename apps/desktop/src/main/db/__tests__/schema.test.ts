import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { openConnection } from '../connection'
import { createDrizzleClient } from '../client'
import { runMigrations } from '../migrate'
import { situation, situationEvent, situationSource, sourceItem } from '../schema'
import { createScratchDb, type ScratchDb } from '../testSupport'

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
})

describe('schema persistence', () => {
  it('links a source item to a situation with an event through real inserts', () => {
    current = createScratchDb()
    const { db } = current
    const now = new Date().toISOString()

    const sourceItemId = randomUUID()
    db.insert(sourceItem)
      .values({
        id: sourceItemId,
        sourceType: 'demo',
        provider: 'demo',
        providerId: 'demo-src-1',
        threadId: 'demo-refund-thread-1',
        subject: 'Your refund request has been received',
        receivedAt: now,
        createdAt: now,
        updatedAt: now
      })
      .run()

    const situationId = randomUUID()
    db.insert(situation)
      .values({
        id: situationId,
        title: 'Amazon Refund',
        summary: 'Refund requested for order #12345.',
        status: 'WAITING',
        priority: 'MEDIUM',
        confidence: 0.9,
        createdAt: now,
        updatedAt: now
      })
      .run()

    db.insert(situationSource)
      .values({
        id: randomUUID(),
        situationId,
        sourceItemId,
        role: 'origin',
        linkedAt: now
      })
      .run()

    db.insert(situationEvent)
      .values({
        id: randomUUID(),
        situationId,
        eventType: 'CREATED',
        toStatus: 'WAITING',
        occurredAt: now
      })
      .run()

    const storedSituation = db.select().from(situation).where(eq(situation.id, situationId)).get()
    expect(storedSituation?.status).toBe('WAITING')

    const links = db
      .select()
      .from(situationSource)
      .where(eq(situationSource.situationId, situationId))
      .all()
    expect(links).toHaveLength(1)
    expect(links[0]?.sourceItemId).toBe(sourceItemId)

    const events = db
      .select()
      .from(situationEvent)
      .where(eq(situationEvent.situationId, situationId))
      .all()
    expect(events).toHaveLength(1)
    expect(events[0]?.eventType).toBe('CREATED')
  })

  it('enforces the provider/providerId uniqueness that prevents duplicate ingestion', () => {
    current = createScratchDb()
    const { db } = current
    const now = new Date().toISOString()
    const values = {
      sourceType: 'demo',
      provider: 'demo',
      providerId: 'demo-src-1',
      receivedAt: now,
      createdAt: now,
      updatedAt: now
    }

    db.insert(sourceItem).values({ id: randomUUID(), ...values }).run()
    expect(() => db.insert(sourceItem).values({ id: randomUUID(), ...values }).run()).toThrow()
  })

  it('persists data across closing and reopening the connection at the same path', () => {
    current = createScratchDb()
    const { sqlite, db: firstDb } = current
    const now = new Date().toISOString()
    const id = randomUUID()

    firstDb
      .insert(situation)
      .values({
        id,
        title: 'Persisted Situation',
        summary: 'Should survive a restart.',
        status: 'ACTION',
        priority: 'LOW',
        confidence: 0.75,
        createdAt: now,
        updatedAt: now
      })
      .run()

    // Simulate an app restart: close this connection, open a fresh one at
    // the same file path, and confirm the data (and applied-migration
    // bookkeeping) survived.
    const dbPath = sqlite.name
    sqlite.close()
    expect(existsSync(dbPath)).toBe(true)

    const reopenedSqlite = openConnection(dbPath)
    const reopenedDb = createDrizzleClient(reopenedSqlite)
    runMigrations(reopenedDb, `${__dirname}/../../../../drizzle/migrations`) // must be a no-op, not a re-apply

    const reread = reopenedDb.select().from(situation).where(eq(situation.id, id)).get()
    expect(reread?.title).toBe('Persisted Situation')
    reopenedSqlite.close()
  })
})
