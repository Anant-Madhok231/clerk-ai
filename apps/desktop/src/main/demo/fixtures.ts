import type { IncomingSourceItem } from '../pipeline/processSourceItem'

/**
 * demo mode's fake inbox. each fixture is just a plain incoming item, same
 * shape as a real gmail message, so it runs through the real pipeline
 * instead of being a fake situation shoved into the ui. the amazon refund
 * pair is two separate messages on one thread on purpose - the waiting ->
 * completed change comes from the real matcher joining them, not faked
 */
export const DEMO_FIXTURES: IncomingSourceItem[] = [
  {
    sourceType: 'demo',
    provider: 'demo',
    providerId: 'demo-amazon-refund-requested',
    threadId: 'demo-thread-amazon-refund',
    sender: 'Amazon',
    subject: 'Your refund request has been received',
    snippet:
      "We've received your refund request for order #12345 ($129.99) and will contact you when processing is complete.",
    receivedAt: '2026-08-10T09:00:00.000Z'
  },
  {
    sourceType: 'demo',
    provider: 'demo',
    providerId: 'demo-apartment-maintenance',
    sender: 'Landlord Property Management',
    subject: 'Maintenance request submitted',
    snippet: "We've received your maintenance request and will follow up once a technician is scheduled.",
    receivedAt: '2026-08-11T09:00:00.000Z'
  },
  {
    sourceType: 'demo',
    provider: 'demo',
    providerId: 'demo-internship-onboarding',
    sender: 'Human Resources',
    subject: 'Complete your internship onboarding',
    snippet: 'Please complete the onboarding paperwork by August 19, 2026.',
    receivedAt: '2026-08-12T09:00:00.000Z'
  },
  {
    sourceType: 'demo',
    provider: 'demo',
    providerId: 'demo-flight-refund',
    sender: 'United Airlines',
    subject: 'Your flight refund has been completed',
    snippet: 'Your flight refund of $84.20 has been completed.',
    receivedAt: '2026-08-12T14:00:00.000Z'
  },
  {
    sourceType: 'demo',
    provider: 'demo',
    providerId: 'demo-rent-reminder',
    sender: 'Identity Apartments',
    subject: 'August rent reminder',
    snippet: 'Your rent of $1,850 must be paid by August 15, 2026.',
    receivedAt: '2026-08-13T09:00:00.000Z'
  },
  {
    sourceType: 'demo',
    provider: 'demo',
    providerId: 'demo-newsletter',
    sender: 'TechDigest Weekly',
    subject: 'This week in tech: our monthly newsletter',
    snippet: 'Check out the latest updates, tips, and stories from our community this month.',
    receivedAt: '2026-08-14T08:00:00.000Z'
  },
  {
    sourceType: 'demo',
    provider: 'demo',
    providerId: 'demo-amazon-refund-processed',
    threadId: 'demo-thread-amazon-refund',
    sender: 'Amazon',
    subject: 'Re: Your refund request has been received',
    snippet: 'Your refund of $129.99 for order #12345 has been processed.',
    receivedAt: '2026-08-15T09:00:00.000Z'
  }
]
