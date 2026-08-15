import { describe, expect, it, vi } from 'vitest'
import { listRecentMessageIds } from '../gmailClient'

describe('listRecentMessageIds', () => {
  it('sends the bearer token and a bounded maxResults, and parses the message list', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'msg-1', threadId: 'thread-1' }] })
    })

    const result = await listRecentMessageIds('token-abc', { maxResults: 3, fetchImpl: fetchImpl as unknown as typeof fetch })

    expect(result).toEqual([{ id: 'msg-1', threadId: 'thread-1' }])
    const call = fetchImpl.mock.calls[0]
    expect(call).toBeDefined()
    const [url, init] = call!
    expect(String(url)).toContain('maxResults=3')
    expect((init as RequestInit).headers).toEqual({ Authorization: 'Bearer token-abc' })
  })

  it('returns an empty array when Gmail reports no messages', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    const result = await listRecentMessageIds('token-abc', { fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(result).toEqual([])
  })

  it('throws with the response body on a non-OK response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid token' })
    await expect(
      listRecentMessageIds('token-abc', { fetchImpl: fetchImpl as unknown as typeof fetch })
    ).rejects.toThrow(/invalid token/)
  })
})
