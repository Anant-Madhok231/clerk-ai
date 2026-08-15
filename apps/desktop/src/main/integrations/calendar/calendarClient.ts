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

export interface UpcomingEvent {
  id: string
  title: string
  /** ISO datetime, or ISO date (YYYY-MM-DD) for all-day events. */
  start: string
  isAllDay: boolean
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

export async function listUpcomingEvents(
  accessToken: string,
  options: { maxResults?: number } = {},
  fetchImpl: typeof fetch = fetch
): Promise<UpcomingEvent[]> {
  const url = new URL(CALENDAR_EVENTS_URL)
  url.searchParams.set('timeMin', new Date().toISOString())
  url.searchParams.set('maxResults', String(options.maxResults ?? 10))
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')

  const response = await fetchImpl(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Google Calendar API error (${response.status}): ${text}`)
  }

  const payload = (await response.json()) as {
    items?: Array<{ id: string; summary?: string; start: { date?: string; dateTime?: string } }>
  }

  return (payload.items ?? []).map((item) => ({
    id: item.id,
    title: item.summary ?? '(No title)',
    start: item.start.dateTime ?? item.start.date ?? '',
    isAllDay: item.start.date !== undefined
  }))
}
