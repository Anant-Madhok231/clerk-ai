import Database from 'better-sqlite3'

/**
 * opens a sqlite connection at whatever path you give it. kept separate
 * from electron's userData path stuff so tests can just point it at a
 * scratch file without booting up electron
 */
export function openConnection(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}
