const GMAIL_MESSAGES_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'

export interface GmailMessageListItem {
  id: string
  threadId: string
}

export interface ListRecentMessagesOptions {
  maxResults?: number
  fetchImpl?: typeof fetch
}

/** kept small on purpose, this runs on every manual/background check, not a full inbox dump */
export async function listRecentMessageIds(
  accessToken: string,
  options: ListRecentMessagesOptions = {}
): Promise<GmailMessageListItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch
  const url = new URL(GMAIL_MESSAGES_URL)
  url.searchParams.set('maxResults', String(options.maxResults ?? 20))
  // gmail searches all mail by default which includes your own sent stuff
  // and drafts. without filtering those out, your own reply looks like a
  // new incoming message and clerk thinks you already handled it
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

export interface ListMessagesInWindowOptions {
  /** how many days back to search, 10 for the first-connect backfill */
  days: number
  /** hard cap on total messages across all pages so a huge inbox can't scan forever */
  maxTotal?: number
  fetchImpl?: typeof fetch
}

// follows gmail's nextPageToken til the whole window's covered or we hit
// maxTotal. listRecentMessageIds doesn't bother with this (one page is
// fine for a quick check) but a backfill needs to actually see everything,
// not just the newest page
export async function listAllMessageIdsInWindow(
  accessToken: string,
  options: ListMessagesInWindowOptions
): Promise<GmailMessageListItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch
  const maxTotal = options.maxTotal ?? 300
  const results: GmailMessageListItem[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(GMAIL_MESSAGES_URL)
    url.searchParams.set('maxResults', '100')
    url.searchParams.set('q', `-in:spam -in:trash -in:sent -in:drafts newer_than:${options.days}d`)
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const response = await fetchImpl(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Gmail API error (${response.status}): ${text}`)
    }

    const payload = (await response.json()) as {
      messages?: GmailMessageListItem[]
      nextPageToken?: string
    }
    results.push(...(payload.messages ?? []))
    pageToken = payload.nextPageToken
  } while (pageToken && results.length < maxTotal)

  return results.slice(0, maxTotal)
}

export interface GmailMessageDetail {
  id: string
  threadId: string
  subject: string | null
  from: string | null
  snippet: string
  /** full message text, prefers plain text and falls back to converted html, null if there's nothing readable */
  body: string | null
  /** epoch ms as a string, that's just how gmail sends it back */
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

// some marketing emails pad their content with invisible characters (anti
// scraping stuff) which show up as weird glyphs if we don't strip them.
// need to strip these from gmail's snippet field too, not just the body
function stripInvisibleChars(text: string): string {
  return text.replace(/[\u200B-\u200F\uFEFF\u00AD]/g, '')
}

function htmlToText(html: string): string {
  return stripInvisibleChars(html)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#39|amp|lt|gt|quot|apos|nbsp);/g, (_, entity: string) => HTML_ENTITIES[entity] ?? ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

/** digs through gmail's (maybe nested) payload tree, grabs plain text if it can find it, else converts the html part */
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

/** grabs the full body for classification, we don't save it to the db though, only the short snippet gets stored */
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
    snippet: stripInvisibleChars(payload.snippet),
    body: extractBodyText(payload.payload),
    internalDate: payload.internalDate
  }
}
