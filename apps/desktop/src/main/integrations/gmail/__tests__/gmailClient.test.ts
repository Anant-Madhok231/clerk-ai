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

  it('excludes the user\'s own Sent and Drafts, not just spam/trash, so a reply is never ingested as a new incoming item on its own thread', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [] })
    })
    await listRecentMessageIds('token-abc', { fetchImpl: fetchImpl as unknown as typeof fetch })
    const call = fetchImpl.mock.calls[0]
    const query = new URL(String(call![0])).searchParams.get('q')
    expect(query).toContain('-in:sent')
    expect(query).toContain('-in:drafts')
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
      body: null,
      internalDate: '1755248400000'
    })
  })

  it('requests the full message format, not just metadata', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'm', threadId: 't', snippet: 's', internalDate: '1' })
    })
    await getMessage('token-abc', 'msg-1', fetchImpl as unknown as typeof fetch)
    const call = fetchImpl.mock.calls[0]
    expect(String(call![0])).toContain('format=full')
  })

  it('extracts the text/plain body, base64url-decoded', async () => {
    const bodyText = 'Please submit the form by Friday, August 21 at 5:00 PM.'
    const encoded = Buffer.from(bodyText, 'utf-8').toString('base64url')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'msg-3',
        threadId: 'thread-3',
        snippet: 'Please submit the form...',
        internalDate: '1755248400000',
        payload: {
          headers: [{ name: 'Subject', value: 'Form due' }],
          mimeType: 'text/plain',
          body: { data: encoded }
        }
      })
    })

    const result = await getMessage('token-abc', 'msg-3', fetchImpl as unknown as typeof fetch)
    expect(result.body).toBe(bodyText)
  })

  it('falls back to text/html converted to plain text when there is no text/plain part', async () => {
    const html = '<div>Hi Anant,<br>Your <b>application</b> is incomplete.<br><a href="https://example.com/form">Complete the form</a></div>'
    const encoded = Buffer.from(html, 'utf-8').toString('base64url')
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'msg-4',
        threadId: 'thread-4',
        snippet: 'Hi Anant...',
        internalDate: '1755248400000',
        payload: {
          headers: [],
          mimeType: 'multipart/alternative',
          parts: [{ mimeType: 'text/html', body: { data: encoded } }]
        }
      })
    })

    const result = await getMessage('token-abc', 'msg-4', fetchImpl as unknown as typeof fetch)
    expect(result.body).toContain('Your application is incomplete')
    expect(result.body).toContain('Complete the form')
    expect(result.body).not.toContain('<div>')
  })

  it('prefers a nested text/plain part over a sibling text/html part', async () => {
    const plainText = 'Plain version: due Friday.'
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'msg-5',
        threadId: 'thread-5',
        snippet: 's',
        internalDate: '1755248400000',
        payload: {
          headers: [],
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: Buffer.from(plainText).toString('base64url') } },
            { mimeType: 'text/html', body: { data: Buffer.from('<p>HTML version</p>').toString('base64url') } }
          ]
        }
      })
    })

    const result = await getMessage('token-abc', 'msg-5', fetchImpl as unknown as typeof fetch)
    expect(result.body).toBe(plainText)
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
