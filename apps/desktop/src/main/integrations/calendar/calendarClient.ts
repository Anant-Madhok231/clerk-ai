const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export interface CreateEventInput {
  title: string
  /** All-day event date, YYYY-MM-DD. Clerk's deadlines are dates, not times. */
  date: string
  description?: string
}

export interface CreatedEvent {
  id: string
  htmlLink: string
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export async function createEvent(
  accessToken: string,
  input: CreateEventInput,
  fetchImpl: typeof fetch = fetch
): Promise<CreatedEvent> {
  const response = await fetchImpl(CALENDAR_EVENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: input.title,
      description: input.description,
      start: { date: input.date },
      end: { date: nextDay(input.date) }
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Google Calendar API error (${response.status}): ${text}`)
  }

  const payload = (await response.json()) as { id: string; htmlLink: string }
  return { id: payload.id, htmlLink: payload.htmlLink }
}
