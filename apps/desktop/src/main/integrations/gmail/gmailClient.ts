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
  // Gmail's default search scope (no `in:` filter) is All Mail, which
  // includes the user's own Sent messages and Drafts -- without excluding
  // them, a reply to a thread gets ingested as a new incoming SourceItem on
  // that same thread, and classification can mistake "the user was active
  // on this thread" for "the user's required action is done."
  url.searchParams.set('q', '-in:spam -in:trash -in:sent -in:drafts newer_than:30d')

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
  /** Full extracted message text (plain-text preferred, HTML converted to text as fallback) — null if the message had no readable body part. */
  body: string | null
  /** Epoch milliseconds, as a string — the format the Gmail API returns. */
  internalDate: string
}

interface RawGmailMessagePart {
  mimeType?: string
  body?: { data?: string }
  parts?: RawGmailMessagePart[]
}

interface RawGmailMessage {
  id: string
  threadId: string
  snippet: string
  internalDate: string
  payload?: { headers?: Array<{ name: string; value: string }> } & RawGmailMessagePart
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  apos: "'",
  nbsp: ' '
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#39|amp|lt|gt|quot|apos|nbsp);/g, (_, entity: string) => HTML_ENTITIES[entity] ?? ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

/** Walks Gmail's (possibly nested multipart) payload tree, preferring the first text/plain part found and falling back to text/html converted to plain text. */
function extractBodyText(part: RawGmailMessagePart | undefined): string | null {
  if (!part) return null

  let htmlFallback: string | null = null

  function walk(node: RawGmailMessagePart): string | null {
    if (node.mimeType === 'text/plain' && node.body?.data) {
      return decodeBase64Url(node.body.data)
    }
    if (node.mimeType === 'text/html' && node.body?.data && htmlFallback === null) {
      htmlFallback = htmlToText(decodeBase64Url(node.body.data))
    }
    for (const child of node.parts ?? []) {
      const found = walk(child)
      if (found) return found
    }
    return null
  }

  return walk(part) ?? htmlFallback
}

/** Full-body fetch — used for classification. Content is used transiently and never persisted to the database, only the short Gmail-generated snippet is stored. */
export async function getMessage(
  accessToken: string,
  messageId: string,
  fetchImpl: typeof fetch = fetch
): Promise<GmailMessageDetail> {
  const url = new URL(`${GMAIL_MESSAGES_URL}/${messageId}`)
  url.searchParams.set('format', 'full')

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
    body: extractBodyText(payload.payload),
    internalDate: payload.internalDate
  }
}
