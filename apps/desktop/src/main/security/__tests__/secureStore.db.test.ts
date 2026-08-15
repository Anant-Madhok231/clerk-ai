import { afterEach, describe, expect, it, vi } from 'vitest'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'

const mockSafeStorage = {
  isEncryptionAvailable: vi.fn(() => true),
  encryptString: vi.fn((value: string) => Buffer.from(`enc:${value}`)),
  decryptString: vi.fn((buffer: Buffer) => buffer.toString('utf8').replace(/^enc:/, ''))
}

vi.mock('electron', () => ({ safeStorage: mockSafeStorage }))

const { clearSecureValue, isSecureStorageAvailable, loadSecureValue, saveSecureValue } =
  await import('../secureStore')

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
  mockSafeStorage.isEncryptionAvailable.mockReturnValue(true)
})

describe('secureStore', () => {
  it('round-trips an arbitrary value through encrypted storage', () => {
    current = createScratchDb()
    expect(loadSecureValue(current.db, 'test.key')).toBeNull()

    saveSecureValue(current.db, 'test.key', { secret: 'value-1' })

    expect(loadSecureValue(current.db, 'test.key')).toEqual({ secret: 'value-1' })
    expect(mockSafeStorage.encryptString).toHaveBeenCalled()
    expect(mockSafeStorage.decryptString).toHaveBeenCalled()
  })

  it('overwrites rather than duplicating on repeated saves', () => {
    current = createScratchDb()
    saveSecureValue(current.db, 'test.key', 'first')
    saveSecureValue(current.db, 'test.key', 'second')
    expect(loadSecureValue(current.db, 'test.key')).toBe('second')
  })

  it('clears a stored value', () => {
    current = createScratchDb()
    saveSecureValue(current.db, 'test.key', 'value')
    clearSecureValue(current.db, 'test.key')
    expect(loadSecureValue(current.db, 'test.key')).toBeNull()
  })

  it('fails clearly rather than silently storing plaintext when secure storage is unavailable', () => {
    current = createScratchDb()
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(false)
    expect(isSecureStorageAvailable()).toBe(false)
    expect(() => saveSecureValue(current.db, 'test.key', 'value')).toThrow(/secure credential storage/i)
  })
})
