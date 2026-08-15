import { afterEach, describe, expect, it } from 'vitest'
import { startLoopbackServer, type LoopbackServerHandle } from '../loopbackServer'

let handle: LoopbackServerHandle | undefined

afterEach(async () => {
  await handle?.close()
  handle = undefined
})

describe('startLoopbackServer', () => {
  it('resolves with the code when the redirect matches the expected state', async () => {
    handle = await startLoopbackServer()
    expect(handle.redirectUri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/)

    const pending = handle.waitForCode('expected-state')
    await fetch(`${handle.redirectUri}?code=auth-code-123&state=expected-state`)

    await expect(pending).resolves.toEqual({ code: 'auth-code-123' })
  })

  it('rejects on a state mismatch — the CSRF guard', async () => {
    handle = await startLoopbackServer()
    // Attach a handler in the same tick the promise is created — otherwise
    // Node can flag it as an unhandled rejection before `expect(...).rejects`
    // gets around to observing it, since the rejection fires from an async
    // HTTP callback rather than synchronously.
    const outcome = handle.waitForCode('expected-state').then(
      (): Error | null => null,
      (error: unknown): Error | null => (error instanceof Error ? error : null)
    )
    await fetch(`${handle.redirectUri}?code=auth-code-123&state=wrong-state`)

    const error = await outcome
    expect(error?.message).toMatch(/state/i)
  })

  it('rejects when Google reports an error param', async () => {
    handle = await startLoopbackServer()
    const outcome = handle.waitForCode('expected-state').then(
      (): Error | null => null,
      (error: unknown): Error | null => (error instanceof Error ? error : null)
    )
    await fetch(`${handle.redirectUri}?error=access_denied&state=expected-state`)

    const error = await outcome
    expect(error?.message).toMatch(/access_denied/)
  })
})
