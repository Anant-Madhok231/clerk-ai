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

  it('recognizes imperative action language beyond the exact-phrase list, using the full body not just the snippet', async () => {
    const result = await provider.classify({
      sourceItem: item({
        subject: 'Next steps',
        snippet: 'Congratulations on advancing.',
        // "Please complete it here" doesn't match the exact "complete your"/
        // "complete the" phrases -- this is exactly the class of real-world
        // wording the old exact-phrase list missed.
        body: 'Congratulations on advancing. Please complete it here: https://example.com/survey. We would appreciate your response this Sunday, August 17.'
      }),
      candidates: []
    })
    expect(result.status).toBe('ACTION')
    // No year stated -- must still resolve using the message's received year, not silently drop the deadline.
    expect(result.deadline).toBe('2026-08-17')
  })

  it('recognizes a sentence-initial instruction verb ("Open...") even with no matching exact phrase', async () => {
    const result = await provider.classify({
      sourceItem: item({
        subject: 'Weekly update',
        snippet: null,
        body: 'Open your dashboard to see who they are.'
      }),
      candidates: []
    })
    expect(result.status).toBe('ACTION')
  })

  it('recognizes personal-correspondence signal phrases regardless of sentence position', async () => {
    const result = await provider.classify({
      sourceItem: item({
        subject: 'You have an update',
        snippet: null,
        body: 'Taylor sent you a message. Open the conversation to read and reply.'
      }),
      candidates: []
    })
    expect(result.status).toBe('ACTION')
  })

  it('does not treat a verb appearing mid-sentence as an instruction (only sentence-initial counts)', async () => {
    const result = await provider.classify({
      sourceItem: item({
        subject: 'Account summary',
        snippet: null,
        body: 'You can review your past orders any time from your account page.'
      }),
      candidates: []
    })
    // "review" appears, but not at the start of a sentence -- should not
    // trigger the broadened imperative detector on its own.
    expect(result.status).toBe('INFORMATIONAL')
  })
})
