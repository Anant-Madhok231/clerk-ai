export type Status = "ACTION" | "WAITING" | "COMPLETED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface DemoSituation {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  amount: number | null;
  deadlineLabel: string | null;
  waitingOn: string | null;
  summary: string;
  nextAction: string | null;
  detectedFrom: string;
  detectedSubject: string;
  detectedDate: string;
  evidence: string;
  timeline: { date: string; detail: string }[];
}

// Mirrors apps/desktop/src/main/db/seedDemo.ts so the public demo matches
// the product's real Demo Mode - this is static data, not a live pipeline,
// since GitHub Pages can't run the Electron app or call an AI provider.
export const DEMO_SITUATIONS: DemoSituation[] = [
  {
    id: "rent",
    title: "Pay August Rent",
    status: "ACTION",
    priority: "HIGH",
    amount: 1850,
    deadlineLabel: "Due tomorrow",
    waitingOn: null,
    summary: "Pay your August apartment rent.",
    nextAction: "Pay $1,850 to Identity Apartments.",
    detectedFrom: "Identity Apartments",
    detectedSubject: "August Rent Reminder",
    detectedDate: "August 13, 2026",
    evidence: 'Clerk found "due August 15" and "$1,850" in the message.',
    timeline: [{ date: "August 13, 2026", detail: "Situation created from an email." }],
  },
  {
    id: "internship-form",
    title: "Complete Internship Onboarding Form",
    status: "ACTION",
    priority: "MEDIUM",
    amount: null,
    deadlineLabel: "Due Friday",
    waitingOn: null,
    summary: "HR needs your onboarding form completed before your start date.",
    nextAction: "Fill out and submit the onboarding form.",
    detectedFrom: "Human Resources",
    detectedSubject: "Complete Your Internship Onboarding Form",
    detectedDate: "August 12, 2026",
    evidence: 'Clerk found "complete... by August 19" in the message.',
    timeline: [{ date: "August 12, 2026", detail: "Situation created from an email." }],
  },
  {
    id: "amazon-refund",
    title: "Amazon Refund",
    status: "WAITING",
    priority: "MEDIUM",
    amount: 129.99,
    deadlineLabel: null,
    waitingOn: "Amazon",
    summary: "Waiting on Amazon to process a $129.99 refund.",
    nextAction: null,
    detectedFrom: "Amazon",
    detectedSubject: "We've received your refund request",
    detectedDate: "August 9, 2026",
    evidence: "Clerk found a refund request confirmation for Order #112-4471932.",
    timeline: [{ date: "August 9, 2026", detail: "Situation created from an email." }],
  },
  {
    id: "maintenance",
    title: "Apartment Maintenance",
    status: "WAITING",
    priority: "MEDIUM",
    amount: null,
    deadlineLabel: null,
    waitingOn: "the landlord",
    summary: "Waiting on the landlord to address a leaking kitchen faucet.",
    nextAction: null,
    detectedFrom: "you@example.com",
    detectedSubject: "Re: Leaking kitchen faucet",
    detectedDate: "August 10, 2026",
    evidence: "Clerk found a maintenance follow-up with no response after 4 days.",
    timeline: [{ date: "August 10, 2026", detail: "Situation created from a follow-up email." }],
  },
  {
    id: "flight-refund",
    title: "Flight Refund",
    status: "COMPLETED",
    priority: "LOW",
    amount: 84.2,
    deadlineLabel: null,
    waitingOn: "JetStream Air",
    summary: "A $84.20 refund for a cancelled flight was completed.",
    nextAction: null,
    detectedFrom: "JetStream Air",
    detectedSubject: "Your $84.20 refund has been completed",
    detectedDate: "August 12, 2026",
    evidence:
      'Clerk found "refund... has been processed and completed" and matched it to the existing Flight Refund situation via the booking reference - no duplicate was created.',
    timeline: [
      { date: "August 4, 2026", detail: "Situation created: waiting on a refund for booking JX48812." },
      { date: "August 12, 2026", detail: "Matched a follow-up email to this situation and marked it complete." },
    ],
  },
];
