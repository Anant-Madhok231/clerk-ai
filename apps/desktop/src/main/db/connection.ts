import Database from 'better-sqlite3'

/**
 * Opens a SQLite connection at the given path. Kept separate from Electron's
 * userData path resolution so it can be pointed at a scratch file in tests
 * without booting Electron.
 */
export function openConnection(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}
