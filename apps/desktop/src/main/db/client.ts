import type Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type Db = ReturnType<typeof createDrizzleClient>

export function createDrizzleClient(sqlite: Database.Database) {
  return drizzle(sqlite, { schema })
}
