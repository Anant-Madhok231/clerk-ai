import { createSecureRecordStore } from '../../security/secureStore'
import type { StoredGoogleTokens } from '../google/googleOAuthConnection'

const store = createSecureRecordStore<StoredGoogleTokens>('gmail.tokens')

export const saveTokens = store.save
export const loadTokens = store.load
export const clearTokens = store.clear
