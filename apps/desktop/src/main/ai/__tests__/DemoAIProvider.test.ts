import { describe, expect, it } from 'vitest'
import { DemoAIProvider } from '../DemoAIProvider'
import type { ClassificationSourceItem } from '../AIProvider'

const provider = new DemoAIProvider()

function item(overrides: Partial<ClassificationSourceItem>): ClassificationSourceItem {
  return {
    sourceType: 'demo',
    provider: 'demo',
    sender: 'Test Sender',
    subject: null,
    snippet: null,
    receivedAt: '2026-08-13T09:00:00.000Z',
    ...overrides
  }
}

describe('DemoAIProvider', () => {
  it('classifies a bill with a stated amount and deadline as ACTION', async () => {
    const result = await provider.classify({
      sourceItem: item({
        subject: 'August rent reminder',
        snippet: 'Your rent of $1,850 must be paid by August 15, 2026.'
      }),
      candidates: []
    })
    expect(result.status).toBe('ACTION')
    expect(result.amount).toBe(1850)
    expect(result.deadline).toBe('2026-08-15')
    expect(result.priority).toBe('HIGH')
  })

  it('classifies an acknowledgement with no prior situation as WAITING', async () => {
    const result = await provider.classify({
      sourceItem: item({
        subject: 'Your refund request has been received',
        snippet: "We've received your refund request for order #12345 ($129.99) and will contact you."
      }),
      candidates: []
    })
    expect(result.status).toBe('WAITING')
    expect(result.amount).toBe(129.99)
    expect(result.waitingOn).toBe('Test Sender')
  })

  it('resolves an existing candidate to COMPLETED when the wording says so', async () => {
    const result = await provider.classify({
      sourceItem: item({
        subject: 'Re: Your refund request has been received',
        snippet: 'Your refund of $129.99 for order #12345 has been processed.'
      }),
      candidates: [{ id: 'situation-1', title: 'Amazon Refund', status: 'WAITING' }]
    })
    expect(result.status).toBe('COMPLETED')
    expect(result.matchedSituationId).toBe('situation-1')
  })

  it('does not fabricate a deadline from a vague date reference', async () => {
    const result = await provider.classify({
      sourceItem: item({
        subject: 'Quick favor',
        snippet: 'Could you please send this over sometime next week?'
      }),
      candidates: []
    })
    expect(result.deadline).toBeUndefined()
  })

  it('classifies a newsletter with no action/waiting/resolution language as INFORMATIONAL', async () => {
    const result = await provider.classify({
      sourceItem: item({
        subject: 'This week in tech: our monthly newsletter',
        snippet: 'Check out the latest updates, tips, and stories from our community this month.'
      }),
      candidates: []
    })
    expect(result.status).toBe('INFORMATIONAL')
  })
})
