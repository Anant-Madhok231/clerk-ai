import { shell } from 'electron'
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  generatePkcePair,
  generateState,
  refreshAccessToken
} from './oauthClient'
import { startLoopbackServer } from './loopbackServer'

export interface StoredGoogleTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope: string
}

export interface GoogleOAuthConnectionOptions {
  clientId: string
  clientSecret: string
  scope: string
  /** just used in the error message when clientId's missing, like "Gmail" or "Google Calendar" */
  serviceName: string
}

/** the oauth flow every google integration shares: PKCE -> browser consent -> loopback redirect -> token exchange. gmail and calendar just differ in scope and where tokens end up */
export async function performGoogleOAuthConnection(
  options: GoogleOAuthConnectionOptions
): Promise<StoredGoogleTokens> {
  if (!options.clientId || !options.clientSecret) {
    throw new Error(
      `Google OAuth credentials are not configured — set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in apps/desktop/.env.local to connect ${options.serviceName}.`
    )
  }

  const { codeVerifier, codeChallenge } = generatePkcePair()
  const state = generateState()
  const loopback = await startLoopbackServer()

  try {
    const authUrl = buildAuthorizationUrl({
      clientId: options.clientId,
      redirectUri: loopback.redirectUri,
      codeChallenge,
      state,
      scope: options.scope
    })
    await shell.openExternal(authUrl)

    const { code } = await loopback.waitForCode(state)
    const tokens = await exchangeCodeForTokens({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      redirectUri: loopback.redirectUri,
      code,
      codeVerifier
    })

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      scope: tokens.scope
    }
  } finally {
    await loopback.close()
  }
}

/**
 * gives back a token that's actually valid, refreshing it (and saving the
 * new one) if it's expired or about to expire in the next minute. every
 * gmail/calendar api call should go through this instead of grabbing
 * tokens.accessToken directly
 */
export async function ensureFreshAccessToken(
  tokens: StoredGoogleTokens,
  credentials: { clientId: string; clientSecret: string },
  saveTokens: (tokens: StoredGoogleTokens) => void
): Promise<string> {
  const expiringSoon = tokens.expiresAt <= Date.now() + 60_000
  if (!expiringSoon) return tokens.accessToken

  if (!tokens.refreshToken) {
    throw new Error('Google access token expired and no refresh token is available — please reconnect.')
  }

  const refreshed = await refreshAccessToken({
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    refreshToken: tokens.refreshToken
  })

  const updated: StoredGoogleTokens = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
    expiresAt: Date.now() + refreshed.expiresIn * 1000,
    scope: refreshed.scope
  }
  saveTokens(updated)
  return updated.accessToken
}
