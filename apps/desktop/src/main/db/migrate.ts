import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { Db } from './client'

export function runMigrations(db: Db, migrationsFolder: string): void {
  migrate(db, { migrationsFolder })
}
