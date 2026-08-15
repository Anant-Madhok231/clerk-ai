import { app } from 'electron'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { openConnection } from './connection'
import { createDrizzleClient, type Db } from './client'
import { runMigrations } from './migrate'

let sqlite: Database.Database | null = null
let db: Db | null = null

// In a packaged build this must resolve to a copy of drizzle/migrations
// shipped as an extraResource — handled by electron-builder config in the
// packaging phase. In dev, app.getAppPath() is the apps/desktop directory,
// where drizzle/migrations already lives.
function resolveMigrationsFolder(): string {
  return join(app.getAppPath(), 'drizzle/migrations')
}

export function initDatabase(): Db {
  if (db) return db
  const dbPath = join(app.getPath('userData'), 'clerk.sqlite3')
  sqlite = openConnection(dbPath)
  db = createDrizzleClient(sqlite)
  runMigrations(db, resolveMigrationsFolder())
  return db
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized — call initDatabase() before getDatabase().')
  }
  return db
}

export function getRawConnection(): Database.Database {
  if (!sqlite) {
    throw new Error('Database not initialized — call initDatabase() before getRawConnection().')
  }
  return sqlite
}
