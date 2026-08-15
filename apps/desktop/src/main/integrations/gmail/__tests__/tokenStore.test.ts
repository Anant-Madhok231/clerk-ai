import { afterEach, describe, expect, it, vi } from 'vitest'
import { createScratchDb, type ScratchDb } from '../../../db/testSupport'

const mockSafeStorage = {
  isEncryptionAvailable: vi.fn(() => true),
  encryptString: vi.fn((value: string) => Buffer.from(`enc:${value}`)),
  decryptString: vi.fn((buffer: Buffer) => buffer.toString('utf8').replace(/^enc:/, ''))
}

vi.mock('electron', () => ({ safeStorage: mockSafeStorage }))

const { clearTokens, isSecureStorageAvailable, loadTokens, saveTokens } = await import('../tokenStore')

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
  mockSafeStorage.isEncryptionAvailable.mockReturnValue(true)
})

describe('tokenStore', () => {
  it('round-trips tokens through encrypted storage', () => {
    current = createScratchDb()
    expect(loadTokens(current.db)).toBeNull()

    saveTokens(current.db, {
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresAt: Date.now() + 3600_000,
      scope: 'gmail.readonly'
    })

    const loaded = loadTokens(current.db)
    expect(loaded?.accessToken).toBe('access-1')
    expect(mockSafeStorage.encryptString).toHaveBeenCalled()
    expect(mockSafeStorage.decryptString).toHaveBeenCalled()
  })

  it('overwrites the previous tokens on reconnect rather than duplicating rows', () => {
    current = createScratchDb()
    saveTokens(current.db, { accessToken: 'first', expiresAt: 0, scope: 'gmail.readonly' })
    saveTokens(current.db, { accessToken: 'second', expiresAt: 0, scope: 'gmail.readonly' })
    expect(loadTokens(current.db)?.accessToken).toBe('second')
  })

  it('clears stored tokens on disconnect', () => {
    current = createScratchDb()
    saveTokens(current.db, { accessToken: 'access-1', expiresAt: 0, scope: 'gmail.readonly' })
    clearTokens(current.db)
    expect(loadTokens(current.db)).toBeNull()
  })

  it('fails clearly rather than silently storing plaintext when secure storage is unavailable', () => {
    current = createScratchDb()
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(false)
    expect(isSecureStorageAvailable()).toBe(false)
    expect(() => saveTokens(current.db, { accessToken: 'x', expiresAt: 0, scope: 'gmail.readonly' })).toThrow(
      /secure credential storage/i
    )
  })
})
