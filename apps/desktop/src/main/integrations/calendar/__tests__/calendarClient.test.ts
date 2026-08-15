import { describe, expect, it, vi } from 'vitest'
import { createEvent } from '../calendarClient'

describe('createEvent', () => {
  it('creates a one-day all-day event and returns its id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'event-1', htmlLink: 'https://calendar.google.com/event-1' })
    })

    const result = await createEvent(
      'token-abc',
      { title: 'Pay August Rent', date: '2026-08-15' },
      fetchImpl as unknown as typeof fetch
    )

    expect(result).toEqual({ id: 'event-1', htmlLink: 'https://calendar.google.com/event-1' })
    const call = fetchImpl.mock.calls[0]
    expect(call).toBeDefined()
    const [, init] = call!
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.start).toEqual({ date: '2026-08-15' })
    expect(body.end).toEqual({ date: '2026-08-16' })
  })

  it('throws with the response body on a non-OK response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'insufficient scope' })
    await expect(
      createEvent('token-abc', { title: 'x', date: '2026-08-15' }, fetchImpl as unknown as typeof fetch)
    ).rejects.toThrow(/insufficient scope/)
  })
})
