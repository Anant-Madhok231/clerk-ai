import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

export interface LoopbackResult {
  code: string
}

export interface LoopbackServerHandle {
  redirectUri: string
  /** Resolves once Google redirects back with a code matching this state, rejects on a state mismatch or an error param. */
  waitForCode: (state: string) => Promise<LoopbackResult>
  close: () => Promise<void>
}

/**
 * Starts an ephemeral HTTP server on 127.0.0.1 to catch Google's OAuth
 * redirect — desktop apps can't register a fixed https redirect URI, so
 * the OS-assigned loopback port + a one-shot local server is the standard
 * pattern.
 */
export function startLoopbackServer(): Promise<LoopbackServerHandle> {
  return new Promise((resolve, reject) => {
    let resolveCode: ((result: LoopbackResult) => void) | null = null
    let rejectCode: ((error: Error) => void) | null = null
    let expectedState: string | null = null

    const server: Server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (url.pathname !== '/callback') {
        res.writeHead(404).end()
        return
      }

      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' }).end('<p>Connection cancelled. You can close this tab.</p>')
        rejectCode?.(new Error(`Google returned an error: ${error}`))
        return
      }

      if (!code || !state || state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' }).end('<p>Invalid response. You can close this tab.</p>')
        rejectCode?.(new Error('OAuth callback missing a code, or state did not match (possible CSRF).'))
        return
      }

      res.writeHead(200, { 'Content-Type': 'text/html' }).end('<p>Clerk is connected. You can close this tab.</p>')
      resolveCode?.({ code })
    })

    server.on('error', reject)

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      const redirectUri = `http://127.0.0.1:${port}/callback`

      resolve({
        redirectUri,
        waitForCode: (state: string) =>
          new Promise<LoopbackResult>((res, rej) => {
            expectedState = state
            resolveCode = res
            rejectCode = rej
          }),
        close: () => new Promise<void>((res) => server.close(() => res()))
      })
    })
  })
}
