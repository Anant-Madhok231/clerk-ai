import { app } from 'electron'
import { join } from 'node:path'
import { openConnection } from './connection'
import { createDrizzleClient, type Db } from './client'
import { runMigrations } from './migrate'

let db: Db | null = null

// in a packaged build this needs to point at the migrations copy that
// electron-builder ships as an extraResource. in dev it's just the
// apps/desktop folder where drizzle/migrations already lives anyway
function resolveMigrationsFolder(): string {
  return join(app.getAppPath(), 'drizzle/migrations')
}

export function initDatabase(): Db {
  if (db) return db
  const dbPath = join(app.getPath('userData'), 'clerk.sqlite3')
  const sqlite = openConnection(dbPath)
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
