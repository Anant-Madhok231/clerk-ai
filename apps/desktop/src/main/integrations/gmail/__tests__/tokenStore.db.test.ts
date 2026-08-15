import { afterEach, describe, expect, it, vi } from 'vitest'
import { createScratchDb, type ScratchDb } from '../../../db/testSupport'

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(`enc:${value}`),
    decryptString: (buffer: Buffer) => buffer.toString('utf8').replace(/^enc:/, '')
  }
}))

const { clearTokens, loadTokens, saveTokens } = await import('../tokenStore')

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
})

describe('gmail tokenStore', () => {
  it('round-trips tokens and clears them on disconnect', () => {
    current = createScratchDb()
    expect(loadTokens(current.db)).toBeNull()

    saveTokens(current.db, {
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresAt: Date.now() + 3600_000,
      scope: 'gmail.readonly'
    })
    expect(loadTokens(current.db)?.accessToken).toBe('access-1')

    clearTokens(current.db)
    expect(loadTokens(current.db)).toBeNull()
  })
})
