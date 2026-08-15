import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { situation } from '../../db/schema'
import { AppSettingsSchema } from '../../settings/appSettings'

const notifyMock = vi.fn()
vi.mock('electron', () => ({
  Notification: class {
    static isSupported() {
      return true
    }
    constructor(public options: { title: string; body: string }) {}
    show() {
      notifyMock(this.options)
    }
  }
}))

const { notifyForResults, notifyUpcomingDeadlines } = await import('../notifyForResults')

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
  notifyMock.mockClear()
})

function seedSituation(current: ScratchDb, overrides: Partial<typeof situation.$inferInsert>) {
  const now = new Date().toISOString()
  const id = randomUUID()
  current.db
    .insert(situation)
    .values({
      id,
      title: 'Test Situation',
      summary: 'Summary',
      status: 'ACTION',
      priority: 'MEDIUM',
      confidence: 0.9,
      createdAt: now,
      updatedAt: now,
      ...overrides
    })
    .run()
  return id
}

const settings = AppSettingsSchema.parse({})

describe('notifyForResults', () => {
  it('notifies for a newly created high-priority action', () => {
    current = createScratchDb()
    const id = seedSituation(current, { priority: 'HIGH', title: 'Pay rent' })
    notifyForResults(current.db, settings, [{ outcome: 'created', situationId: id, status: 'ACTION' }])
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0]?.[0]?.title).toBe('Pay rent')
  })

  it('does not notify for a newly created low-priority action', () => {
    current = createScratchDb()
    const id = seedSituation(current, { priority: 'LOW' })
    notifyForResults(current.db, settings, [{ outcome: 'created', situationId: id, status: 'ACTION' }])
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('notifies when a situation resolves to COMPLETED', () => {
    current = createScratchDb()
    const id = seedSituation(current, { status: 'COMPLETED', title: 'Amazon Refund' })
    notifyForResults(current.db, settings, [{ outcome: 'updated', situationId: id, status: 'COMPLETED', transitioned: true }])
    expect(notifyMock).toHaveBeenCalledTimes(1)
  })

  it('respects the highPriorityActions notification toggle', () => {
    current = createScratchDb()
    const id = seedSituation(current, { priority: 'URGENT' })
    const disabled = AppSettingsSchema.parse({ notifications: { highPriorityActions: false } })
    notifyForResults(current.db, disabled, [{ outcome: 'created', situationId: id, status: 'ACTION' }])
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('does not notify twice for the same deadline in one session', () => {
    current = createScratchDb()
    const today = new Date().toISOString().slice(0, 10)
    seedSituation(current, { deadline: today })
    notifyUpcomingDeadlines(current.db, settings)
    notifyUpcomingDeadlines(current.db, settings)
    expect(notifyMock).toHaveBeenCalledTimes(1)
  })
})
