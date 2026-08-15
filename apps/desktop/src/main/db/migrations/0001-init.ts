// Migration SQL lives in TS modules rather than loose .sql files so it
// bundles reliably into the packaged app without extra asset-copy config.
export const migration0001Init = {
  id: '0001_init',
  sql: `
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `
}
