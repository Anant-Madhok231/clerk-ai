import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { runMigrations } from "./migrations.js";
import * as schema from "./schema.js";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let rawInstance: Database.Database | null = null;

export function getDbPath(): string {
  const userData = app.getPath("userData");
  fs.mkdirSync(userData, { recursive: true });
  return path.join(userData, "clerk.db");
}

export function getDb() {
  if (dbInstance) return dbInstance;
  const raw = new Database(getDbPath());
  runMigrations(raw);
  rawInstance = raw;
  dbInstance = drizzle(raw, { schema });
  return dbInstance;
}

export function closeDb(): void {
  rawInstance?.close();
  rawInstance = null;
  dbInstance = null;
}
