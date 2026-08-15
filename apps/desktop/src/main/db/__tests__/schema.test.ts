import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openConnection } from '../connection'
import { createDrizzleClient, type Db } from '../client'
import { runMigrations } from '../migrate'
import { situation, situationEvent, situationSource, sourceItem } from '../schema'

const MIGRATIONS_FOLDER = join(__dirname, '../../../../drizzle/migrations')

let scratchDir: string
let dbPath: string
let openConnections: Database.Database[]

beforeEach(() => {
  scratchDir = mkdtempSync(join(tmpdir(), 'clerk-db-test-'))
  dbPath = join(scratchDir, 'clerk.sqlite3')
  openConnections = []
})

afterEach(() => {
  for (const connection of openConnections) {
    if (connection.open) connection.close()
  }
  rmSync(scratchDir, { recursive: true, force: true })
})

function openMigratedDb(): { sqlite: Database.Database; db: Db } {
  const sqlite = openConnection(dbPath)
  openConnections.push(sqlite)
  const db = createDrizzleClient(sqlite)
  runMigrations(db, MIGRATIONS_FOLDER)
  return { sqlite, db }
}

describe('schema persistence', () => {
  it('links a source item to a situation with an event through real inserts', () => {
    const { db } = openMigratedDb()
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
    const { db } = openMigratedDb()
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
    const { sqlite, db: firstDb } = openMigratedDb()
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
    sqlite.close()
    expect(existsSync(dbPath)).toBe(true)

    const reopenedSqlite = openConnection(dbPath)
    openConnections.push(reopenedSqlite)
    const reopenedDb = createDrizzleClient(reopenedSqlite)
    runMigrations(reopenedDb, MIGRATIONS_FOLDER) // must be a no-op, not a re-apply

    const reread = reopenedDb.select().from(situation).where(eq(situation.id, id)).get()
    expect(reread?.title).toBe('Persisted Situation')
  })
})
