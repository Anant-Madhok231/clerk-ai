import { afterEach, describe, expect, it } from 'vitest'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { isGmailBootstrapCompleted, markGmailBootstrapCompleted } from '../gmailBootstrap'

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
})

describe('gmail bootstrap completion marker', () => {
  it('reports not completed until explicitly marked', () => {
    current = createScratchDb()
    expect(isGmailBootstrapCompleted(current.db)).toBe(false)
  })

  it('reports completed after marking, and stays idempotent across repeated marks', () => {
    current = createScratchDb()
    markGmailBootstrapCompleted(current.db)
    expect(isGmailBootstrapCompleted(current.db)).toBe(true)

    // Marking twice must not throw (onConflictDoUpdate) and must remain completed.
    markGmailBootstrapCompleted(current.db)
    expect(isGmailBootstrapCompleted(current.db)).toBe(true)
  })
})
