import type { Db } from '../db/client'
import { clearSecureValue, loadSecureValue, saveSecureValue } from '../security/secureStore'

const OPENAI_API_KEY_KEY = 'openai.apiKey'

export function saveOpenAIApiKey(db: Db, apiKey: string): void {
  saveSecureValue(db, OPENAI_API_KEY_KEY, { apiKey })
}

export function loadOpenAIApiKey(db: Db): string | null {
  return loadSecureValue<{ apiKey: string }>(db, OPENAI_API_KEY_KEY)?.apiKey ?? null
}

export function clearOpenAIApiKey(db: Db): void {
  clearSecureValue(db, OPENAI_API_KEY_KEY)
}
