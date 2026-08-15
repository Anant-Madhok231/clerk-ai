import { eq } from 'drizzle-orm'
import { safeStorage } from 'electron'
import type { Db } from '../../db/client'
import { settings } from '../../db/schema'

const TOKENS_KEY = 'gmail.tokens'

export interface StoredTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope: string
}

export function isSecureStorageAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

function requireSecureStorage(): void {
  if (!isSecureStorageAvailable()) {
    throw new Error(
      'Secure credential storage is unavailable on this system, so Clerk cannot store Gmail tokens safely.'
    )
  }
}

export function saveTokens(db: Db, tokens: StoredTokens): void {
  requireSecureStorage()
  const encrypted = safeStorage.encryptString(JSON.stringify(tokens)).toString('base64')
  const now = new Date().toISOString()
  db.insert(settings)
    .values({ key: TOKENS_KEY, value: encrypted, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: encrypted, updatedAt: now } })
    .run()
}

export function loadTokens(db: Db): StoredTokens | null {
  const row = db.select().from(settings).where(eq(settings.key, TOKENS_KEY)).get()
  if (!row) return null
  requireSecureStorage()
  const decrypted = safeStorage.decryptString(Buffer.from(row.value, 'base64'))
  return JSON.parse(decrypted) as StoredTokens
}

export function clearTokens(db: Db): void {
  db.delete(settings).where(eq(settings.key, TOKENS_KEY)).run()
}
