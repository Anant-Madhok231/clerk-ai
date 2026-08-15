const GMAIL_MESSAGES_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'

export interface GmailMessageListItem {
  id: string
  threadId: string
}

export interface ListRecentMessagesOptions {
  maxResults?: number
  fetchImpl?: typeof fetch
}

/** Bounded by design — this is called on every manual/background check, never a full-inbox dump. */
export async function listRecentMessageIds(
  accessToken: string,
  options: ListRecentMessagesOptions = {}
): Promise<GmailMessageListItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch
  const url = new URL(GMAIL_MESSAGES_URL)
  url.searchParams.set('maxResults', String(options.maxResults ?? 20))
  url.searchParams.set('q', '-in:spam -in:trash newer_than:30d')

  const response = await fetchImpl(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gmail API error (${response.status}): ${text}`)
  }

  const payload = (await response.json()) as { messages?: GmailMessageListItem[] }
  return payload.messages ?? []
}

export interface GmailMessageDetail {
  id: string
  threadId: string
  subject: string | null
  from: string | null
  snippet: string
  /** Epoch milliseconds, as a string — the format the Gmail API returns. */
  internalDate: string
}

interface RawGmailMessage {
  id: string
  threadId: string
  snippet: string
  internalDate: string
  payload?: { headers?: Array<{ name: string; value: string }> }
}

/** Metadata-only fetch (no full body) — enough to classify without storing the complete message indefinitely. */
export async function getMessage(
  accessToken: string,
  messageId: string,
  fetchImpl: typeof fetch = fetch
): Promise<GmailMessageDetail> {
  const url = new URL(`${GMAIL_MESSAGES_URL}/${messageId}`)
  url.searchParams.set('format', 'metadata')
  url.searchParams.append('metadataHeaders', 'Subject')
  url.searchParams.append('metadataHeaders', 'From')

  const response = await fetchImpl(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gmail API error (${response.status}): ${text}`)
  }

  const payload = (await response.json()) as RawGmailMessage
  const headers = payload.payload?.headers ?? []
  const subject = headers.find((h) => h.name === 'Subject')?.value ?? null
  const from = headers.find((h) => h.name === 'From')?.value ?? null

  return {
    id: payload.id,
    threadId: payload.threadId,
    subject,
    from,
    snippet: payload.snippet,
    internalDate: payload.internalDate
  }
}
