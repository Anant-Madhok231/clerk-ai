import { shell } from 'electron'
import { buildAuthorizationUrl, exchangeCodeForTokens, generatePkcePair, generateState } from './oauthClient'
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
  /** Used only in the error message when clientId is missing, e.g. "Gmail" or "Google Calendar". */
  serviceName: string
}

/** The desktop OAuth dance shared by every Google integration: PKCE -> system-browser consent -> loopback redirect -> token exchange. Gmail and Calendar differ only in scope and where the resulting tokens get stored. */
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
