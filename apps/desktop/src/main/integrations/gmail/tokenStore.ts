import type { Db } from '../../db/client'
import { clearSecureValue, loadSecureValue, saveSecureValue } from '../../security/secureStore'

const TOKENS_KEY = 'gmail.tokens'

export interface StoredTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope: string
}

export function saveTokens(db: Db, tokens: StoredTokens): void {
  saveSecureValue(db, TOKENS_KEY, tokens)
}

export function loadTokens(db: Db): StoredTokens | null {
  return loadSecureValue<StoredTokens>(db, TOKENS_KEY)
}

export function clearTokens(db: Db): void {
  clearSecureValue(db, TOKENS_KEY)
}
