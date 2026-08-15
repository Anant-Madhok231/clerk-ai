import { eq } from 'drizzle-orm'
import { safeStorage } from 'electron'
import type { Db } from '../db/client'
import { settings } from '../db/schema'

export function isSecureStorageAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

function requireSecureStorage(): void {
  if (!isSecureStorageAvailable()) {
    throw new Error(
      'Secure credential storage is unavailable on this system, so Clerk cannot store this credential safely.'
    )
  }
}

/** Encrypts `value` via safeStorage and stores it under `key` in the settings table — the shared mechanism behind Gmail tokens and the OpenAI API key. */
export function saveSecureValue(db: Db, key: string, value: unknown): void {
  requireSecureStorage()
  const encrypted = safeStorage.encryptString(JSON.stringify(value)).toString('base64')
  const now = new Date().toISOString()
  db.insert(settings)
    .values({ key, value: encrypted, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: encrypted, updatedAt: now } })
    .run()
}

export function loadSecureValue<T>(db: Db, key: string): T | null {
  const row = db.select().from(settings).where(eq(settings.key, key)).get()
  if (!row) return null
  requireSecureStorage()
  const decrypted = safeStorage.decryptString(Buffer.from(row.value, 'base64'))
  return JSON.parse(decrypted) as T
}

export function clearSecureValue(db: Db, key: string): void {
  db.delete(settings).where(eq(settings.key, key)).run()
}
