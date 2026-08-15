import type { Db } from '../../db/client'
import { clearSecureValue, loadSecureValue, saveSecureValue } from '../../security/secureStore'
import type { StoredGoogleTokens } from '../google/googleOAuthConnection'

const TOKENS_KEY = 'calendar.tokens'

export function saveTokens(db: Db, tokens: StoredGoogleTokens): void {
  saveSecureValue(db, TOKENS_KEY, tokens)
}

export function loadTokens(db: Db): StoredGoogleTokens | null {
  return loadSecureValue<StoredGoogleTokens>(db, TOKENS_KEY)
}

export function clearTokens(db: Db): void {
  clearSecureValue(db, TOKENS_KEY)
}
