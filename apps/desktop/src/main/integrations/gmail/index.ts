import type { Db } from '../../db/client'
import type { AIProvider } from '../../ai/AIProvider'
import { processSourceItem, type ProcessResult } from '../../pipeline/processSourceItem'
import { GOOGLE_SCOPES } from '../google/oauthClient'
import { ensureFreshAccessToken, performGoogleOAuthConnection } from '../google/googleOAuthConnection'
import { clearTokens, loadTokens, saveTokens } from './tokenStore'
import { getMessage, listRecentMessageIds, type GmailMessageListItem } from './gmailClient'

export interface GmailAdapterOptions {
  clientId: string
  clientSecret: string
}

/**
 * Facade over the Gmail OAuth + API plumbing: system-browser consent ->
 * loopback redirect -> encrypted token storage -> bounded API calls ->
 * (via sync()) the same processSourceItem pipeline Demo Mode uses.
 */
export class GmailAdapter {
  constructor(
    private readonly db: Db,
    private readonly options: GmailAdapterOptions
  ) {}

  isConnected(): boolean {
    return loadTokens(this.db) !== null
  }

  async connect(): Promise<void> {
    const tokens = await performGoogleOAuthConnection({
      clientId: this.options.clientId,
      clientSecret: this.options.clientSecret,
      scope: GOOGLE_SCOPES.gmailReadonly,
      serviceName: 'Gmail'
    })
    saveTokens(this.db, tokens)
  }

  disconnect(): void {
    clearTokens(this.db)
  }

  /** Loads stored tokens, transparently refreshing an expired access token before returning it. */
  private async getValidAccessToken(): Promise<string> {
    const tokens = loadTokens(this.db)
    if (!tokens) throw new Error('Gmail is not connected.')
    return ensureFreshAccessToken(tokens, this.options, (updated) => saveTokens(this.db, updated))
  }

  async listRecentMessageIds(limit = 5): Promise<GmailMessageListItem[]> {
    const accessToken = await this.getValidAccessToken()
    return listRecentMessageIds(accessToken, { maxResults: limit })
  }

  /**
   * Bounded fetch (default 20, last 30 days per gmailClient's query) of
   * message metadata, normalized and run through the same ingestion
   * pipeline Demo Mode uses. Not incremental (no Gmail history cursor) —
   * relies on processSourceItem's provider/providerId dedupe to make
   * repeated calls cheap rather than tracking a sync cursor.
   */
  async sync(aiProvider: AIProvider, maxResults = 20): Promise<ProcessResult[]> {
    const accessToken = await this.getValidAccessToken()

    const messages = await listRecentMessageIds(accessToken, { maxResults })
    const results: ProcessResult[] = []
    for (const { id } of messages) {
      const detail = await getMessage(accessToken, id)
      results.push(
        await processSourceItem(this.db, aiProvider, {
          sourceType: 'gmail',
          provider: 'gmail',
          providerId: detail.id,
          threadId: detail.threadId,
          sender: detail.from,
          subject: detail.subject,
          snippet: detail.snippet,
          receivedAt: new Date(Number(detail.internalDate)).toISOString()
        })
      )
    }
    return results
  }
}
