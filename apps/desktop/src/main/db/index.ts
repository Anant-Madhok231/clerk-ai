import { app } from 'electron'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { openConnection } from './connection'
import { runMigrations } from './migrate'

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db
  const dbPath = join(app.getPath('userData'), 'clerk.sqlite3')
  db = openConnection(dbPath)
  runMigrations(db)
  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized — call initDatabase() before getDatabase().')
  }
  return db
}
