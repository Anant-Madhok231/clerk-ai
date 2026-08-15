import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { openConnection } from './connection'
import { createDrizzleClient, type Db } from './client'
import { runMigrations } from './migrate'

const MIGRATIONS_FOLDER = join(__dirname, '../../../drizzle/migrations')

export interface ScratchDb {
  sqlite: Database.Database
  db: Db
  cleanup: () => void
}

/** A freshly migrated SQLite database at a scratch file path, for tests that need real persistence rather than mocks. */
export function createScratchDb(): ScratchDb {
  const scratchDir = mkdtempSync(join(tmpdir(), 'clerk-db-test-'))
  const dbPath = join(scratchDir, 'clerk.sqlite3')
  const sqlite = openConnection(dbPath)
  const db = createDrizzleClient(sqlite)
  runMigrations(db, MIGRATIONS_FOLDER)

  return {
    sqlite,
    db,
    cleanup: () => {
      if (sqlite.open) sqlite.close()
      rmSync(scratchDir, { recursive: true, force: true })
    }
  }
}
