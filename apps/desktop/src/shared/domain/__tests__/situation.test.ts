import { describe, expect, it } from 'vitest'
import {
  applyTransition,
  canTransition,
  reconcileStatus,
  type SituationStatus
} from '../situation'

const ALL_STATUSES: SituationStatus[] = ['ACTION', 'WAITING', 'COMPLETED', 'INFORMATIONAL']

describe('canTransition', () => {
  it('allows every status to stay the same', () => {
    for (const status of ALL_STATUSES) {
      expect(canTransition(status, status)).toBe(true)
    }
  })

  it('allows ACTION to move to WAITING, COMPLETED, or INFORMATIONAL', () => {
    expect(canTransition('ACTION', 'WAITING')).toBe(true)
    expect(canTransition('ACTION', 'COMPLETED')).toBe(true)
    expect(canTransition('ACTION', 'INFORMATIONAL')).toBe(true)
  })

  it('allows WAITING to move to ACTION, COMPLETED, or INFORMATIONAL', () => {
    expect(canTransition('WAITING', 'ACTION')).toBe(true)
    expect(canTransition('WAITING', 'COMPLETED')).toBe(true)
    expect(canTransition('WAITING', 'INFORMATIONAL')).toBe(true)
  })

  it('treats COMPLETED as terminal', () => {
    expect(canTransition('COMPLETED', 'ACTION')).toBe(false)
    expect(canTransition('COMPLETED', 'WAITING')).toBe(false)
    expect(canTransition('COMPLETED', 'INFORMATIONAL')).toBe(false)
  })

  it('treats INFORMATIONAL as terminal', () => {
    expect(canTransition('INFORMATIONAL', 'ACTION')).toBe(false)
    expect(canTransition('INFORMATIONAL', 'WAITING')).toBe(false)
    expect(canTransition('INFORMATIONAL', 'COMPLETED')).toBe(false)
  })
})

describe('applyTransition', () => {
  it('returns the new status on a valid transition', () => {
    expect(applyTransition('WAITING', 'COMPLETED')).toEqual({ ok: true, status: 'COMPLETED' })
  })

  it('returns a reason on an invalid transition', () => {
    const result = applyTransition('COMPLETED', 'ACTION')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('COMPLETED')
      expect(result.reason).toContain('ACTION')
    }
  })
})

describe('reconcileStatus', () => {
  it('resolves the flagship WAITING -> COMPLETED refund scenario', () => {
    const result = reconcileStatus('WAITING', 'COMPLETED')
    expect(result).toEqual({ ok: true, status: 'COMPLETED' })
  })

  it('does not let a duplicate or stale message reopen a COMPLETED situation', () => {
    const result = reconcileStatus('COMPLETED', 'WAITING')
    expect(result.ok).toBe(false)
  })

  it('lets a re-classification confirm the same status', () => {
    const result = reconcileStatus('ACTION', 'ACTION')
    expect(result).toEqual({ ok: true, status: 'ACTION' })
  })
})
