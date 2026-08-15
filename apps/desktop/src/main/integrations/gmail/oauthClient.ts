import { createHash, randomBytes } from 'node:crypto'

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

export interface PkcePair {
  codeVerifier: string
  codeChallenge: string
}

/** PKCE (RFC 7636) — no client secret, the desktop-app OAuth pattern Google recommends for installed apps. */
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
}

export function buildAuthorizationUrl(options: AuthorizationUrlOptions): string {
  const url = new URL(AUTHORIZATION_ENDPOINT)
  url.searchParams.set('client_id', options.clientId)
  url.searchParams.set('redirect_uri', options.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GMAIL_READONLY_SCOPE)
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
