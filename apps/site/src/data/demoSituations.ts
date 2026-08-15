// Static, seeded — mirrors the outcomes Clerk's real demo pipeline produces
// (apps/desktop/src/main/demo/fixtures.ts) from the same seven fixtures, not
// invented numbers. No live data, no credentials, nothing to connect.

export type Status = 'ACTION' | 'WAITING' | 'COMPLETED' | 'INFORMATIONAL'

export interface DemoSituation {
  id: string
  title: string
  summary: string
  status: Status
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  amount: number | null
  deadline: string | null
  waitingOn: string | null
  source: { subject: string; sender: string; date: string }
  timeline: { label: string; date: string }[]
}

export const DEMO_SITUATIONS: DemoSituation[] = [
  {
    id: 'rent',
    title: 'August rent reminder',
    summary: 'Your rent of $1,850 must be paid by August 15, 2026.',
    status: 'ACTION',
    priority: 'HIGH',
    amount: 1850,
    deadline: 'August 15, 2026',
    waitingOn: null,
    source: { subject: 'August rent reminder', sender: 'Identity Apartments', date: 'Aug 13, 2026' },
    timeline: [{ label: 'Situation created', date: 'Aug 13, 2026' }]
  },
  {
    id: 'onboarding',
    title: 'Complete your internship onboarding',
    summary: 'Please complete the onboarding paperwork by August 19, 2026.',
    status: 'ACTION',
    priority: 'MEDIUM',
    amount: null,
    deadline: 'August 19, 2026',
    waitingOn: null,
    source: { subject: 'Complete your internship onboarding', sender: 'Human Resources', date: 'Aug 12, 2026' },
    timeline: [{ label: 'Situation created', date: 'Aug 12, 2026' }]
  },
  {
    id: 'maintenance',
    title: 'Maintenance request submitted',
    summary: "We've received your maintenance request and will follow up once a technician is scheduled.",
    status: 'WAITING',
    priority: 'MEDIUM',
    amount: null,
    deadline: null,
    waitingOn: 'Landlord Property Management',
    source: { subject: 'Maintenance request submitted', sender: 'Landlord Property Management', date: 'Aug 11, 2026' },
    timeline: [{ label: 'Situation created', date: 'Aug 11, 2026' }]
  },
  {
    id: 'refund',
    title: 'Your refund request has been received',
    summary: 'Your refund of $129.99 for order #12345 has been processed.',
    status: 'COMPLETED',
    priority: 'LOW',
    amount: 129.99,
    deadline: null,
    waitingOn: null,
    source: { subject: 'Your refund request has been received', sender: 'Amazon', date: 'Aug 10, 2026' },
    timeline: [
      { label: 'Situation created — WAITING', date: 'Aug 10, 2026' },
      { label: 'Status changed: WAITING → COMPLETED', date: 'Aug 15, 2026' }
    ]
  },
  {
    id: 'flight',
    title: 'Your flight refund has been completed',
    summary: 'Your flight refund of $84.20 has been completed.',
    status: 'COMPLETED',
    priority: 'LOW',
    amount: 84.2,
    deadline: null,
    waitingOn: null,
    source: { subject: 'Your flight refund has been completed', sender: 'United Airlines', date: 'Aug 12, 2026' },
    timeline: [{ label: 'Situation created', date: 'Aug 12, 2026' }]
  },
  {
    id: 'newsletter',
    title: 'This week in tech: our monthly newsletter',
    summary: 'Check out the latest updates, tips, and stories from our community this month.',
    status: 'INFORMATIONAL',
    priority: 'LOW',
    amount: null,
    deadline: null,
    waitingOn: null,
    source: { subject: 'This week in tech: our monthly newsletter', sender: 'TechDigest Weekly', date: 'Aug 14, 2026' },
    timeline: [{ label: 'Situation created', date: 'Aug 14, 2026' }]
  }
]
