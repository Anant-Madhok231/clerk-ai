import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { createScratchDb, type ScratchDb } from '../../db/testSupport'
import { situation, situationEvent } from '../../db/schema'
import {
  addSituationToCalendar,
  AlreadyOnCalendarError,
  MissingDeadlineError
} from '../addToCalendar'
import type { CalendarAdapter } from '../../integrations/calendar'

let current: ScratchDb

afterEach(() => {
  current?.cleanup()
})

function seedSituation(current: ScratchDb, overrides: Partial<{ deadline: string | null; calendarEventId: string | null }> = {}) {
  const { db } = current
  const now = new Date().toISOString()
  const id = randomUUID()
  db.insert(situation)
    .values({
      id,
      title: 'Pay August Rent',
      summary: 'Rent is due.',
      status: 'ACTION',
      priority: 'HIGH',
      confidence: 0.9,
      deadline: '2026-08-15',
      createdAt: now,
      updatedAt: now,
      ...overrides
    })
    .run()
  return id
}

function fakeCalendarAdapter(createEvent = vi.fn().mockResolvedValue({ id: 'event-1', htmlLink: 'https://calendar.google.com/event-1' })): CalendarAdapter {
  return { createEvent } as unknown as CalendarAdapter
}

describe('addSituationToCalendar', () => {
  it('creates an event, stores its id, and logs a CALENDAR_EVENT_CREATED event', async () => {
    current = createScratchDb()
    const situationId = seedSituation(current)
    const adapter = fakeCalendarAdapter()

    const result = await addSituationToCalendar(current.db, adapter, situationId)
    expect(result.eventId).toBe('event-1')

    const row = current.db.select().from(situation).where(eq(situation.id, situationId)).get()
    expect(row?.calendarEventId).toBe('event-1')

    const events = current.db
      .select()
      .from(situationEvent)
      .where(eq(situationEvent.situationId, situationId))
      .all()
    expect(events.map((e) => e.eventType)).toEqual(['CALENDAR_EVENT_CREATED'])
  })

  it('refuses to create a duplicate event for a situation already on the calendar', async () => {
    current = createScratchDb()
    const situationId = seedSituation(current, { calendarEventId: 'existing-event' })
    const adapter = fakeCalendarAdapter()

    await expect(addSituationToCalendar(current.db, adapter, situationId)).rejects.toBeInstanceOf(
      AlreadyOnCalendarError
    )
    expect(adapter.createEvent).not.toHaveBeenCalled()
  })

  it('refuses to create an event for a situation with no deadline', async () => {
    current = createScratchDb()
    const situationId = seedSituation(current, { deadline: null })
    const adapter = fakeCalendarAdapter()

    await expect(addSituationToCalendar(current.db, adapter, situationId)).rejects.toBeInstanceOf(
      MissingDeadlineError
    )
  })
})
