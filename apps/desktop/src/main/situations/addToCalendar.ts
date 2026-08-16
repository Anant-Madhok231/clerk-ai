import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { situation, situationEvent } from '../db/schema'
import type { CalendarAdapter } from '../integrations/calendar'

export class AlreadyOnCalendarError extends Error {}
export class MissingDeadlineError extends Error {}
export class SituationNotFoundError extends Error {}

export interface AddToCalendarResult {
  eventId: string
  htmlLink: string
}

/** calendar writes are gated behind confirmation, this only runs after the user confirms the event in a dialog, never automatic */
export async function addSituationToCalendar(
  db: Db,
  calendarAdapter: CalendarAdapter,
  situationId: string
): Promise<AddToCalendarResult> {
  const row = db.select().from(situation).where(eq(situation.id, situationId)).get()
  if (!row) throw new SituationNotFoundError(`Situation ${situationId} not found.`)
  if (row.calendarEventId) {
    throw new AlreadyOnCalendarError('This situation is already on the calendar.')
  }
  if (!row.deadline) {
    throw new MissingDeadlineError('This situation has no deadline to add to the calendar.')
  }

  const created = await calendarAdapter.createEvent({
    title: row.title,
    date: row.deadline,
    description: row.summary
  })
  const now = new Date().toISOString()

  db.update(situation)
    .set({ calendarEventId: created.id, updatedAt: now })
    .where(eq(situation.id, situationId))
    .run()

  db.insert(situationEvent)
    .values({
      id: randomUUID(),
      situationId,
      eventType: 'CALENDAR_EVENT_CREATED',
      occurredAt: now,
      payload: JSON.stringify({ calendarEventId: created.id })
    })
    .run()

  return { eventId: created.id, htmlLink: created.htmlLink }
}
