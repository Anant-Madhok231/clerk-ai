import { shell } from 'electron'
import type { Db } from '../../db/client'
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  generatePkcePair,
  generateState
} from './oauthClient'
import { startLoopbackServer } from './loopbackServer'
import { clearTokens, loadTokens, saveTokens } from './tokenStore'
import { listRecentMessageIds, type GmailMessageListItem } from './gmailClient'

export interface GmailAdapterOptions {
  clientId: string
}

/**
 * Facade over the Gmail OAuth + API plumbing: system-browser consent ->
 * loopback redirect -> encrypted token storage -> bounded API calls. Real
 * sync (mapping messages to SourceItems, incremental history) is a later
 * phase; this proves the connection itself works end to end.
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
    if (!this.options.clientId) {
      throw new Error(
        'Gmail OAuth client id is not configured — set GMAIL_OAUTH_CLIENT_ID in apps/desktop/.env.local.'
      )
    }
    const { codeVerifier, codeChallenge } = generatePkcePair()
    const state = generateState()
    const loopback = await startLoopbackServer()

    try {
      const authUrl = buildAuthorizationUrl({
        clientId: this.options.clientId,
        redirectUri: loopback.redirectUri,
        codeChallenge,
        state
      })
      await shell.openExternal(authUrl)

      const { code } = await loopback.waitForCode(state)
      const tokens = await exchangeCodeForTokens({
        clientId: this.options.clientId,
        redirectUri: loopback.redirectUri,
        code,
        codeVerifier
      })

      saveTokens(this.db, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
        scope: tokens.scope
      })
    } finally {
      await loopback.close()
    }
  }

  disconnect(): void {
    clearTokens(this.db)
  }

  async listRecentMessageIds(limit = 5): Promise<GmailMessageListItem[]> {
    const tokens = loadTokens(this.db)
    if (!tokens) throw new Error('Gmail is not connected.')
    return listRecentMessageIds(tokens.accessToken, { maxResults: limit })
  }
}
