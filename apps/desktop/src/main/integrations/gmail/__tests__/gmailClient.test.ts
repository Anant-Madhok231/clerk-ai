import { describe, expect, it, vi } from 'vitest'
import { getMessage, listRecentMessageIds } from '../gmailClient'

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

describe('getMessage', () => {
  it('extracts subject/from headers and the snippet', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'msg-1',
        threadId: 'thread-1',
        snippet: 'Your refund request has been received.',
        internalDate: '1755248400000',
        payload: {
          headers: [
            { name: 'Subject', value: 'Your refund request has been received' },
            { name: 'From', value: 'Amazon <no-reply@amazon.com>' }
          ]
        }
      })
    })

    const result = await getMessage('token-abc', 'msg-1', fetchImpl as unknown as typeof fetch)
    expect(result).toEqual({
      id: 'msg-1',
      threadId: 'thread-1',
      subject: 'Your refund request has been received',
      from: 'Amazon <no-reply@amazon.com>',
      snippet: 'Your refund request has been received.',
      internalDate: '1755248400000'
    })
  })

  it('returns null headers when Subject/From are missing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'msg-2',
        threadId: 'thread-2',
        snippet: 'No headers here.',
        internalDate: '1755248400000'
      })
    })

    const result = await getMessage('token-abc', 'msg-2', fetchImpl as unknown as typeof fetch)
    expect(result.subject).toBeNull()
    expect(result.from).toBeNull()
  })
})
