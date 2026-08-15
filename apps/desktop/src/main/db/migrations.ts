import type Database from "better-sqlite3";

/**
 * Hand-written, idempotent DDL run on every launch. A drizzle-kit migration
 * folder would be overkill for a single-user local SQLite file with a
 * schema that changes rarely - CREATE TABLE IF NOT EXISTS covers first
 * launch and every launch after a schema addition equally well.
 */
export function runMigrations(db: Database.Database): void {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS source_items (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_id TEXT,
      thread_id TEXT,
      sender TEXT,
      subject TEXT,
      snippet TEXT,
      received_at TEXT,
      file_name TEXT,
      content_hash TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      body_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_source_items_content_hash ON source_items(content_hash);
    CREATE INDEX IF NOT EXISTS idx_source_items_provider_id ON source_items(provider_id);
    CREATE INDEX IF NOT EXISTS idx_source_items_thread_id ON source_items(thread_id);

    CREATE TABLE IF NOT EXISTS situations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      category TEXT NOT NULL,
      next_action TEXT,
      deadline TEXT,
      deadline_confidence REAL,
      amount REAL,
      currency TEXT,
      waiting_on TEXT,
      confidence REAL NOT NULL,
      user_confirmed INTEGER NOT NULL DEFAULT 0,
      merchant_key TEXT,
      reference_code TEXT,
      calendar_event_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_situations_status ON situations(status);
    CREATE INDEX IF NOT EXISTS idx_situations_merchant_key ON situations(merchant_key);
    CREATE INDEX IF NOT EXISTS idx_situations_reference_code ON situations(reference_code);

    CREATE TABLE IF NOT EXISTS situation_sources (
      situation_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (situation_id, source_id)
    );

    CREATE TABLE IF NOT EXISTS situation_events (
      id TEXT PRIMARY KEY,
      situation_id TEXT NOT NULL,
      type TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_situation_events_situation_id ON situation_events(situation_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gmail_sync_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      history_id TEXT,
      last_synced_at TEXT,
      status TEXT NOT NULL DEFAULT 'disconnected'
    );
  `);
}
