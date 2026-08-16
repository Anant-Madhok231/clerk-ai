import { createHash, randomBytes } from 'node:crypto'

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

export const GOOGLE_SCOPES = {
  gmailReadonly: 'https://www.googleapis.com/auth/gmail.readonly',
  calendarEvents: 'https://www.googleapis.com/auth/calendar.events'
} as const

export interface PkcePair {
  codeVerifier: string
  codeChallenge: string
}

/**
 * PKCE is what actually protects this since the client secret ships inside
 * every install and isn't really secret. google's token endpoint still
 * wants the secret sent as a param anyway for desktop app type clients,
 * even though it's not treated as secret here
 */
export function generatePkcePair(): PkcePair {
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

export function generateState(): string {
  return randomBytes(16).toString('base64url')
}

export interface AuthorizationUrlOptions {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
  scope: string
}

export function buildAuthorizationUrl(options: AuthorizationUrlOptions): string {
  const url = new URL(AUTHORIZATION_ENDPOINT)
  url.searchParams.set('client_id', options.clientId)
  url.searchParams.set('redirect_uri', options.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', options.scope)
  url.searchParams.set('code_challenge', options.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', options.state)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  return url.toString()
}

export interface TokenResponse {
  accessToken: string
  refreshToken?: string
  expiresIn: number
  scope: string
  tokenType: string
}

export interface ExchangeCodeOptions {
  clientId: string
  clientSecret: string
  redirectUri: string
  code: string
  codeVerifier: string
  fetchImpl?: typeof fetch
}

export async function exchangeCodeForTokens(options: ExchangeCodeOptions): Promise<TokenResponse> {
  const fetchImpl = options.fetchImpl ?? fetch
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: options.code,
    redirect_uri: options.redirectUri,
    client_id: options.clientId,
    client_secret: options.clientSecret,
    code_verifier: options.codeVerifier
  })

  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Google token exchange failed (${response.status}): ${text}`)
  }

  const payload = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope: string
    token_type: string
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
    scope: payload.scope,
    tokenType: payload.token_type
  }
}

export interface RefreshTokenOptions {
  clientId: string
  clientSecret: string
  refreshToken: string
  fetchImpl?: typeof fetch
}

/** access tokens die after about an hour, this swaps the refresh token for a fresh one when that happens */
export async function refreshAccessToken(options: RefreshTokenOptions): Promise<TokenResponse> {
  const fetchImpl = options.fetchImpl ?? fetch
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: options.refreshToken,
    client_id: options.clientId,
    client_secret: options.clientSecret
  })

  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Google token refresh failed (${response.status}): ${text}`)
  }

  const payload = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope: string
    token_type: string
  }

  return {
    accessToken: payload.access_token,
    // google usually doesn't send a new refresh_token back, the old one just stays valid til it's revoked
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
    scope: payload.scope,
    tokenType: payload.token_type
  }
}
