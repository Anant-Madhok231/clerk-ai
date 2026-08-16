import type { Db } from '../../db/client'
import type { AIProvider } from '../../ai/AIProvider'
import { processSourceItem, type ProcessResult } from '../../pipeline/processSourceItem'
import { GOOGLE_SCOPES } from '../google/oauthClient'
import { ensureFreshAccessToken, performGoogleOAuthConnection } from '../google/googleOAuthConnection'
import { clearTokens, loadTokens, saveTokens } from './tokenStore'
import {
  getMessage,
  listAllMessageIdsInWindow,
  listRecentMessageIds,
  type GmailMessageListItem
} from './gmailClient'

export interface GmailAdapterOptions {
  clientId: string
  clientSecret: string
}

/**
 * wraps the gmail oauth + api plumbing: browser consent -> loopback
 * redirect -> encrypted token storage -> bounded api calls ->
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

  /** grabs stored tokens, refreshing the access token first if it's expired */
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
   * grabs a small bounded batch of recent messages (last 30 days, 20 max)
   * and runs them through the same pipeline demo mode uses. not
   * incremental, just relies on dedupe to make repeat calls cheap instead
   * of tracking a proper sync cursor
   */
  async sync(aiProvider: AIProvider, maxResults = 20): Promise<ProcessResult[]> {
    const accessToken = await this.getValidAccessToken()
    const messages = await listRecentMessageIds(accessToken, { maxResults })
    return this.processMessages(accessToken, aiProvider, messages)
  }

  /**
   * one time deep backfill of the last 10 days, fully paginated, unlike
   * sync() which just grabs a small page. runs once after first connect
   * and once for old installs that connected before this existed. safe to
   * call more than once, dedupe makes it a no-op either way
   */
  async bootstrapSync(aiProvider: AIProvider, days = 10): Promise<ProcessResult[]> {
    const accessToken = await this.getValidAccessToken()
    const messages = await listAllMessageIdsInWindow(accessToken, { days })
    return this.processMessages(accessToken, aiProvider, messages)
  }

  private async processMessages(
    accessToken: string,
    aiProvider: AIProvider,
    messages: GmailMessageListItem[]
  ): Promise<ProcessResult[]> {
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
          body: detail.body,
          receivedAt: new Date(Number(detail.internalDate)).toISOString()
        })
      )
    }
    return results
  }
}
