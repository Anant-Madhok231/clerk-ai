import { SqliteSituationTools } from "./situationRepo.js";
import { ingestSource } from "./sourceRepo.js";
import { getDb } from "./client.js";
import { situations } from "./schema.js";

const tools = new SqliteSituationTools();

function daysFromNow(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function daysAgoIso(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString();
}

/**
 * Seeds the exact demo scenarios called out in the product spec, including
 * a WAITING -> COMPLETED transition, using the real repository/tool layer
 * so the demo dashboard exercises the same code paths as a live account.
 * Every seeded source is tagged demo: true so the UI can label it clearly.
 */
export async function seedDemoData(): Promise<void> {
  const db = getDb();
  const existing = await db.select().from(situations).limit(1);
  if (existing.length > 0) return; // don't re-seed over real or prior demo data

  const rentSource = await ingestSource({
    sourceType: "gmail",
    provider: "gmail",
    providerId: "demo-rent-1",
    threadId: "demo-thread-rent",
    sender: "billing@identityapartments.com",
    subject: "August Rent Reminder",
    snippet: "Your August rent of $1,850 is due August 15.",
    receivedAt: daysAgoIso(1),
    fileName: null,
    bodyText: "Your August rent of $1,850 must be paid by August 15.",
    metadata: { demo: true },
  });
  const rent = await tools.createSituation({
    title: "Pay August Rent",
    summary: "Pay your August apartment rent.",
    status: "ACTION",
    priority: "HIGH",
    category: "housing",
    nextAction: "Pay $1,850 to Identity Apartments.",
    deadline: daysFromNow(1),
    deadlineConfidence: 0.95,
    amount: 1850,
    currency: "USD",
    waitingOn: null,
    confidence: 0.95,
    merchantKey: "identityapartments",
    referenceCode: null,
    sourceId: rentSource.source.id,
  });
  await tools.recordSituationEvent(rent.id, "CREATED", 'Clerk found "due August 15" and "$1,850" in the message.');

  const formSource = await ingestSource({
    sourceType: "gmail",
    provider: "gmail",
    providerId: "demo-form-1",
    threadId: "demo-thread-form",
    sender: "hr@acmeinternships.com",
    subject: "Complete Your Internship Onboarding Form",
    snippet: "Please complete the onboarding form by Friday.",
    receivedAt: daysAgoIso(2),
    fileName: null,
    bodyText: "Please complete your internship onboarding form by August 19.",
    metadata: { demo: true },
  });
  const form = await tools.createSituation({
    title: "Complete Internship Onboarding Form",
    summary: "HR needs your onboarding form completed before your start date.",
    status: "ACTION",
    priority: "MEDIUM",
    category: "employment",
    nextAction: "Fill out and submit the onboarding form.",
    deadline: daysFromNow(5),
    deadlineConfidence: 0.88,
    amount: null,
    currency: null,
    waitingOn: null,
    confidence: 0.88,
    merchantKey: "acmeinternships",
    referenceCode: null,
    sourceId: formSource.source.id,
  });
  await tools.recordSituationEvent(form.id, "CREATED", 'Clerk found "complete... by August 19" in the message.');

  const refundRequestSource = await ingestSource({
    sourceType: "gmail",
    provider: "gmail",
    providerId: "demo-refund-1",
    threadId: "demo-thread-refund",
    sender: "auto-confirm@amazon.com",
    subject: "We've received your refund request",
    snippet: "We'll email you once your $129.99 refund is processed.",
    receivedAt: daysAgoIso(5),
    fileName: null,
    bodyText: "We have received your refund request for Order #112-4471932 ($129.99) and will email you once it's processed.",
    metadata: { demo: true },
  });
  const refund = await tools.createSituation({
    title: "Amazon Refund",
    summary: "Waiting on Amazon to process a $129.99 refund.",
    status: "WAITING",
    priority: "MEDIUM",
    category: "shopping",
    nextAction: null,
    deadline: null,
    deadlineConfidence: null,
    amount: 129.99,
    currency: "USD",
    waitingOn: "Amazon",
    confidence: 0.9,
    merchantKey: "amazon",
    referenceCode: "112-4471932",
    sourceId: refundRequestSource.source.id,
  });
  await tools.recordSituationEvent(refund.id, "CREATED", "Clerk found a refund request confirmation for Order #112-4471932.");

  const maintenanceSource = await ingestSource({
    sourceType: "gmail",
    provider: "gmail",
    providerId: "demo-maintenance-1",
    threadId: "demo-thread-maintenance",
    sender: "you@example.com",
    subject: "Re: Leaking kitchen faucet",
    snippet: "Following up on the maintenance request I submitted.",
    receivedAt: daysAgoIso(4),
    fileName: null,
    bodyText: "Following up again on the maintenance request I submitted about the leaking kitchen faucet.",
    metadata: { demo: true },
  });
  const maintenance = await tools.createSituation({
    title: "Apartment Maintenance",
    summary: "Waiting on the landlord to address a leaking kitchen faucet.",
    status: "WAITING",
    priority: "MEDIUM",
    category: "housing",
    nextAction: null,
    deadline: null,
    deadlineConfidence: null,
    amount: null,
    currency: null,
    waitingOn: "the landlord",
    confidence: 0.82,
    merchantKey: "identityapartments",
    referenceCode: null,
    sourceId: maintenanceSource.source.id,
  });
  await tools.recordSituationEvent(maintenance.id, "CREATED", "Clerk found a maintenance follow-up with no response after 4 days.");

  const flightRequestSource = await ingestSource({
    sourceType: "gmail",
    provider: "gmail",
    providerId: "demo-flight-1",
    threadId: "demo-thread-flight",
    sender: "help@fly-jetstream.com",
    subject: "Your cancellation refund is being processed",
    snippet: "We're processing your $84.20 refund.",
    receivedAt: daysAgoIso(10),
    fileName: null,
    bodyText: "Your flight cancellation refund of $84.20 for booking JX48812 is being processed.",
    metadata: { demo: true },
  });
  const flight = await tools.createSituation({
    title: "Flight Refund",
    summary: "Waiting on a $84.20 refund for a cancelled flight.",
    status: "WAITING",
    priority: "LOW",
    category: "travel",
    nextAction: null,
    deadline: null,
    deadlineConfidence: null,
    amount: 84.2,
    currency: "USD",
    waitingOn: "JetStream Air",
    confidence: 0.87,
    merchantKey: "fly-jetstream",
    referenceCode: "JX48812",
    sourceId: flightRequestSource.source.id,
  });
  await tools.recordSituationEvent(flight.id, "CREATED", "Clerk found a refund-processing confirmation for booking JX48812.");

  const flightResolvedSource = await ingestSource({
    sourceType: "gmail",
    provider: "gmail",
    providerId: "demo-flight-2",
    threadId: "demo-thread-flight",
    sender: "help@fly-jetstream.com",
    subject: "Your $84.20 refund has been completed",
    snippet: "Your refund for booking JX48812 has been completed.",
    receivedAt: daysAgoIso(2),
    fileName: null,
    bodyText: "Your $84.20 refund for booking JX48812 has been processed and completed.",
    metadata: { demo: true },
  });
  await tools.addSituationSource(flight.id, flightResolvedSource.source.id);
  await tools.updateSituation(flight.id, {
    status: "COMPLETED",
    resolvedAt: daysAgoIso(2),
    confidence: 0.93,
  });
  await tools.recordSituationEvent(
    flight.id,
    "MARKED_COMPLETE",
    'Clerk found "refund... has been processed and completed" and matched it to the existing Flight Refund situation via the booking reference.'
  );
}
