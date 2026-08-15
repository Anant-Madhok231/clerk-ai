import type Database from 'better-sqlite3'

const NOTE_KEY = 'note'

export function getNote(db: Database.Database): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(NOTE_KEY) as
    | { value: string }
    | undefined
  return row?.value ?? ''
}

export function setNote(db: Database.Database, text: string): void {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (@key, @value, @updatedAt)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run({ key: NOTE_KEY, value: text, updatedAt: new Date().toISOString() })
}
