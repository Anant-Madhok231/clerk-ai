import type Database from 'better-sqlite3'
import { migrations } from './migrations'

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `)

  const appliedRows = db.prepare('SELECT id FROM _migrations').all() as Array<{ id: string }>
  const applied = new Set(appliedRows.map((row) => row.id))
  const markApplied = db.prepare('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)')

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue
    db.transaction(() => {
      db.exec(migration.sql)
      markApplied.run(migration.id, new Date().toISOString())
    })()
  }
}
