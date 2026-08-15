import type { Db } from '../db/client'
import { createSecureRecordStore } from '../security/secureStore'

const store = createSecureRecordStore<{ apiKey: string }>('openai.apiKey')

export function saveOpenAIApiKey(db: Db, apiKey: string): void {
  store.save(db, { apiKey })
}

export function loadOpenAIApiKey(db: Db): string | null {
  return store.load(db)?.apiKey ?? null
}

export function clearOpenAIApiKey(db: Db): void {
  store.clear(db)
}
