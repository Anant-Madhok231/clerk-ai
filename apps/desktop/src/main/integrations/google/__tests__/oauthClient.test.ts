import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  GOOGLE_SCOPES,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  generatePkcePair,
  generateState
} from '../oauthClient'

describe('generatePkcePair', () => {
  it('derives the code challenge as base64url(sha256(verifier)), per RFC 7636', () => {
    const { codeVerifier, codeChallenge } = generatePkcePair()
    const expected = createHash('sha256').update(codeVerifier).digest('base64url')
    expect(codeChallenge).toBe(expected)
  })

  it('generates a verifier long enough to satisfy RFC 7636 (43-128 chars)', () => {
    const { codeVerifier } = generatePkcePair()
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43)
    expect(codeVerifier.length).toBeLessThanOrEqual(128)
  })

  it('generates distinct pairs on every call', () => {
    const a = generatePkcePair()
    const b = generatePkcePair()
    expect(a.codeVerifier).not.toBe(b.codeVerifier)
  })
})

describe('generateState', () => {
  it('generates a non-empty, distinct value each call', () => {
    expect(generateState()).not.toBe(generateState())
  })
})

describe('buildAuthorizationUrl', () => {
  it('includes PKCE, state, and the Gmail read-only scope', () => {
    const url = new URL(
      buildAuthorizationUrl({
        clientId: 'client-123',
        redirectUri: 'http://127.0.0.1:5000/callback',
        codeChallenge: 'challenge-abc',
        state: 'state-xyz',
        scope: GOOGLE_SCOPES.gmailReadonly
      })
    )
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('client-123')
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:5000/callback')
    expect(url.searchParams.get('code_challenge')).toBe('challenge-abc')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('state')).toBe('state-xyz')
    expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/gmail.readonly')
  })
})

describe('exchangeCodeForTokens', () => {
  it('parses a successful token response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        token_type: 'Bearer'
      })
    })

    const result = await exchangeCodeForTokens({
      clientId: 'client-123',
      clientSecret: 'secret-456',
      redirectUri: 'http://127.0.0.1:5000/callback',
      code: 'auth-code',
      codeVerifier: 'verifier',
      fetchImpl: fetchImpl as unknown as typeof fetch
    })

    expect(result.accessToken).toBe('access-token')
    expect(result.refreshToken).toBe('refresh-token')
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws with the response body on a non-OK response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'invalid_grant'
    })

    await expect(
      exchangeCodeForTokens({
        clientId: 'client-123',
        clientSecret: 'secret-456',
        redirectUri: 'http://127.0.0.1:5000/callback',
        code: 'bad-code',
        codeVerifier: 'verifier',
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).rejects.toThrow(/invalid_grant/)
  })
})
