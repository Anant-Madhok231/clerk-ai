import { afterEach, describe, expect, it } from 'vitest'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { getDismissalSignals, matchesDismissalSignal, recordDismissalSignal } from '../dismissalSignals'

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
})

describe('dismissalSignals', () => {
  it('returns no signals when nothing has been recorded', () => {
    current = createScratchDb()
    expect(getDismissalSignals(current.db)).toEqual([])
  })

  it('matches a new item from the exact same sender', () => {
    current = createScratchDb()
    recordDismissalSignal(current.db, {
      sender: 'deals@retailer.com',
      subject: 'Flash sale just for you',
      sourceTitle: 'Flash sale just for you'
    })

    expect(
      matchesDismissalSignal(current.db, { sender: 'deals@retailer.com', subject: 'Something totally different' })
    ).toBe(true)
  })

  it('matches a new item with a similar-worded subject from a different sender', () => {
    current = createScratchDb()
    recordDismissalSignal(current.db, {
      sender: 'promo@storeone.com',
      subject: 'Huge weekend clearance sale event',
      sourceTitle: 'Huge weekend clearance sale event'
    })

    expect(
      matchesDismissalSignal(current.db, {
        sender: 'other@storetwo.com',
        subject: 'Weekend clearance sale starts now'
      })
    ).toBe(true)
  })

  it('does not match unrelated mail', () => {
    current = createScratchDb()
    recordDismissalSignal(current.db, {
      sender: 'deals@retailer.com',
      subject: 'Flash sale just for you',
      sourceTitle: 'Flash sale just for you'
    })

    expect(
      matchesDismissalSignal(current.db, { sender: 'landlord@apartments.com', subject: 'Your rent is due' })
    ).toBe(false)
  })

  it('does not blow up recording a signal with no usable sender or keywords', () => {
    current = createScratchDb()
    recordDismissalSignal(current.db, { sender: null, subject: '', sourceTitle: '' })
    expect(getDismissalSignals(current.db)).toEqual([])
  })
})
