const GMAIL_MESSAGES_LIST_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'

export interface GmailMessageListItem {
  id: string
  threadId: string
}

export interface ListRecentMessagesOptions {
  maxResults?: number
  fetchImpl?: typeof fetch
}

/**
 * A single bounded request — proves the token/auth plumbing works without
 * pulling in the full googleapis SDK for what is, at this phase, a
 * one-call proof rather than real sync.
 */
export async function listRecentMessageIds(
  accessToken: string,
  options: ListRecentMessagesOptions = {}
): Promise<GmailMessageListItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch
  const url = new URL(GMAIL_MESSAGES_LIST_URL)
  url.searchParams.set('maxResults', String(options.maxResults ?? 5))
  url.searchParams.set('q', '-in:spam -in:trash')

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
