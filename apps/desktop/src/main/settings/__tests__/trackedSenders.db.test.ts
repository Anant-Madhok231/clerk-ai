import { afterEach, describe, expect, it } from 'vitest'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { addTrackedSender, getTrackedSenders, isTrackedSender, removeTrackedSender } from '../trackedSenders'

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
})

describe('trackedSenders', () => {
  it('returns an empty list when nothing is tracked', () => {
    current = createScratchDb()
    expect(getTrackedSenders(current.db)).toEqual([])
  })

  it('adds and matches an exact email address', () => {
    current = createScratchDb()
    addTrackedSender(current.db, { matchType: 'EXACT_EMAIL', value: 'recruiter@company.com', displayName: 'Recruiter' })

    expect(isTrackedSender(current.db, 'Recruiting Team <recruiter@company.com>')).toBe(true)
    expect(isTrackedSender(current.db, 'someone.else@company.com')).toBe(false)
  })

  it('adds and matches a domain, without matching a look-alike domain', () => {
    current = createScratchDb()
    addTrackedSender(current.db, { matchType: 'DOMAIN', value: 'company.com', displayName: 'Company' })

    expect(isTrackedSender(current.db, 'anyone@company.com')).toBe(true)
    // The exact failure mode called out in the spec: naive substring
    // matching would incorrectly treat "fakecompany.com" as matching
    // "company.com". This must not happen.
    expect(isTrackedSender(current.db, 'someone@fakecompany.com')).toBe(false)
    expect(isTrackedSender(current.db, 'someone@notcompany.com')).toBe(false)
  })

  it('normalizes a leading "@" on domain values', () => {
    current = createScratchDb()
    addTrackedSender(current.db, { matchType: 'DOMAIN', value: '@company.com', displayName: 'Company' })
    expect(isTrackedSender(current.db, 'anyone@company.com')).toBe(true)
  })

  it('is case-insensitive', () => {
    current = createScratchDb()
    addTrackedSender(current.db, { matchType: 'EXACT_EMAIL', value: 'Recruiter@Company.com', displayName: 'R' })
    expect(isTrackedSender(current.db, 'recruiter@company.com')).toBe(true)
  })

  it('returns false for an untracked sender, and false/no-throw for a missing sender', () => {
    current = createScratchDb()
    expect(isTrackedSender(current.db, 'nobody@nowhere.com')).toBe(false)
    expect(isTrackedSender(current.db, null)).toBe(false)
    expect(isTrackedSender(current.db, undefined)).toBe(false)
  })

  it('removes a tracked sender by id', () => {
    current = createScratchDb()
    const afterAdd = addTrackedSender(current.db, {
      matchType: 'EXACT_EMAIL',
      value: 'recruiter@company.com',
      displayName: 'Recruiter'
    })
    const id = afterAdd[0]!.id
    expect(isTrackedSender(current.db, 'recruiter@company.com')).toBe(true)

    removeTrackedSender(current.db, id)
    expect(isTrackedSender(current.db, 'recruiter@company.com')).toBe(false)
    expect(getTrackedSenders(current.db)).toEqual([])
  })
})
