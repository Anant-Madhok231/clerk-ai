import { ExtractionSchema, isFabricatedPreciseDeadline, type Extraction } from "./schema.js";
import type { MatchCandidate } from "@clerk-ai/core";

export interface ExtractionRequest {
  /** Combined subject + sender + body/snippet, already trimmed to a bounded size. */
  text: string;
  sender: string | null;
  subject: string | null;
  receivedAt: string | null;
  /** Deterministic candidates from packages/core's matcher, ranked highest first. */
  candidates: MatchCandidate[];
}

export interface AIProvider {
  readonly name: string;
  extract(request: ExtractionRequest): Promise<Extraction>;
}

/**
 * Runs without any API key so the product is fully usable offline and in
 * review. Uses bounded, explainable heuristics rather than a real model —
 * good enough to demonstrate the four-state pipeline deterministically, and
 * it doubles as the fixture data behind the required unit tests.
 */
export class DemoAIProvider implements AIProvider {
  readonly name = "demo";

  async extract(request: ExtractionRequest): Promise<Extraction> {
    return classifyHeuristically(request);
  }
}

const CURRENCY_AMOUNT = /\$\s?([\d,]+(?:\.\d{2})?)/;
const EXPLICIT_DATE =
  /\b((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)\b/i;
const RELATIVE_DAY = /\b(tomorrow|today|tonight)\b/i;
const WAITING_PHRASES =
  /\b(we('| )ve received your|will (contact|notify|update) you|is (being processed|under review)|we're looking into|has been submitted and is (pending|awaiting))\b/i;
const RESOLUTION_PHRASES =
  /\b(has been (processed|completed|resolved|approved|refunded)|is now complete|we('| )ve (resolved|completed|refunded)|your refund of)\b/i;
const ACTION_PHRASES =
  /\b(must be paid|is due|please (complete|submit|sign|confirm|upload|return)|action required|you need to)\b/i;
const INFORMATIONAL_PHRASES =
  /\b(newsletter|unsubscribe|weekly digest|here('| )s what('| )s new|no action (is )?(needed|required))\b/i;

function classifyHeuristically(request: ExtractionRequest): Extraction {
  const { text, candidates } = request;
  const lower = text.toLowerCase();

  const amountMatch = CURRENCY_AMOUNT.exec(text);
  const amount = amountMatch?.[1] ? Number(amountMatch[1].replace(/,/g, "")) : null;

  const explicitDate = EXPLICIT_DATE.exec(text);
  const relativeDay = RELATIVE_DAY.exec(lower);
  const rawDeadlineText = explicitDate?.[1] ?? relativeDay?.[1] ?? null;
  const deadline = rawDeadlineText ? resolveDeadlineToISO(rawDeadlineText) : null;
  const deadlineConfidence = deadline ? (explicitDate ? 0.92 : 0.8) : null;

  const topCandidate = candidates[0] ?? null;
  const isResolution = RESOLUTION_PHRASES.test(lower) && topCandidate !== null;
  const isWaiting = !isResolution && WAITING_PHRASES.test(lower);
  const isAction = !isResolution && !isWaiting && ACTION_PHRASES.test(lower);
  const isInformational =
    !isResolution && !isWaiting && !isAction && (INFORMATIONAL_PHRASES.test(lower) || amount === null);

  let classification: Extraction["classification"];
  if (isResolution) classification = "COMPLETED";
  else if (isWaiting) classification = "WAITING";
  else if (isAction) classification = "ACTION";
  else if (isInformational) classification = "INFORMATIONAL";
  else classification = amount !== null || deadline !== null ? "ACTION" : "INFORMATIONAL";

  const title = deriveTitle(request, classification);
  const priority = derivePriority({ deadline, amount, classification });
  const confidence = deriveConfidence({ classification, amount, deadline, hasCandidate: !!topCandidate });

  const fabricated = rawDeadlineText ? isFabricatedPreciseDeadline(text, deadline) : false;
  const safeDeadline = fabricated ? null : deadline;
  const safeDeadlineConfidence = fabricated ? null : deadlineConfidence;

  const extraction: Extraction = {
    classification,
    title,
    summary: summarize(text),
    category: deriveCategory(lower),
    priority,
    deadline: safeDeadline,
    deadlineConfidence: safeDeadlineConfidence,
    amount,
    currency: amount !== null ? "USD" : null,
    nextAction: classification === "ACTION" ? deriveNextAction(text) : null,
    waitingOn: classification === "WAITING" || classification === "COMPLETED" ? deriveWaitingOn(request) : null,
    confidence,
    relatedSituationId: isResolution || (topCandidate && topCandidate.score >= 0.55) ? topCandidate!.situation.id : null,
    relationshipType: isResolution ? "RESOLUTION" : topCandidate && topCandidate.score >= 0.55 ? "UPDATE" : classification === "INFORMATIONAL" ? null : "NEW",
    resolutionEvidence: isResolution ? extractResolutionEvidence(text) : null,
    requiresUserConfirmation: confidence < 0.85,
    evidenceSummary: buildEvidenceSummary({ deadline: rawDeadlineText, amount, classification }),
  };

  return ExtractionSchema.parse(extraction);
}

function deriveTitle(request: ExtractionRequest, classification: Extraction["classification"]): string {
  if (request.subject && request.subject.length < 80) return cleanSubject(request.subject);
  const firstSentence = request.text.split(/[.!?\n]/)[0]?.trim() ?? "New item";
  return firstSentence.slice(0, 80) || classification;
}

function cleanSubject(subject: string): string {
  return subject.replace(/^(re|fwd?):\s*/i, "").trim();
}

function summarize(text: string): string {
  const sentence = text.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").trim();
  return sentence.length > 0 ? sentence.slice(0, 400) : text.slice(0, 400);
}

function deriveCategory(lowerText: string): string {
  if (/rent|lease|apartment/.test(lowerText)) return "housing";
  if (/refund|return|order/.test(lowerText)) return "shopping";
  if (/internship|onboarding|employment|hr\b/.test(lowerText)) return "employment";
  if (/appointment|reservation/.test(lowerText)) return "appointment";
  if (/invoice|bill|payment/.test(lowerText)) return "bill";
  if (/university|school|enrollment|tuition/.test(lowerText)) return "school";
  return "general";
}

function derivePriority(args: {
  deadline: string | null;
  amount: number | null;
  classification: Extraction["classification"];
}): Extraction["priority"] {
  if (args.classification === "INFORMATIONAL") return "LOW";
  if (args.deadline) {
    const days = daysUntil(args.deadline);
    if (days !== null && days <= 1) return "URGENT";
    if (days !== null && days <= 3) return "HIGH";
  }
  if (args.amount !== null && args.amount >= 500) return "HIGH";
  if (args.classification === "WAITING") return "MEDIUM";
  return "MEDIUM";
}

function deriveConfidence(args: {
  classification: Extraction["classification"];
  amount: number | null;
  deadline: string | null;
  hasCandidate: boolean;
}): number {
  let confidence = 0.75;
  if (args.deadline) confidence += 0.1;
  if (args.amount !== null) confidence += 0.05;
  if (args.classification === "INFORMATIONAL") confidence = 0.9;
  if (args.hasCandidate) confidence += 0.05;
  return Math.min(confidence, 0.98);
}

function deriveNextAction(text: string): string {
  const match = /(pay|complete|submit|sign|confirm|upload|return)[^.!?]*/i.exec(text);
  return match ? capitalize(match[0].trim()) : "Review and respond.";
}

function deriveWaitingOn(request: ExtractionRequest): string {
  if (request.sender) {
    const domainMatch = /@([\w.-]+)\./.exec(request.sender);
    if (domainMatch?.[1]) return capitalize(domainMatch[1]);
  }
  return "the sender";
}

function extractResolutionEvidence(text: string): string {
  const match = RESOLUTION_PHRASES.exec(text);
  const context = match ? text.slice(Math.max(0, match.index - 40), match.index + 80) : text.slice(0, 120);
  return context.trim();
}

function buildEvidenceSummary(args: {
  deadline: string | null;
  amount: number | null;
  classification: Extraction["classification"];
}): string {
  const parts: string[] = [];
  if (args.deadline) parts.push(`a deadline of "${args.deadline}"`);
  if (args.amount !== null) parts.push(`an amount of $${args.amount}`);
  if (parts.length === 0) {
    return `Clerk classified this as ${args.classification.toLowerCase()} based on the message content.`;
  }
  return `Clerk found ${parts.join(" and ")} in the message.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function daysUntil(isoDate: string): number | null {
  const target = new Date(isoDate + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const diffMs = target.getTime() - new Date(now.toDateString()).getTime();
  return Math.round(diffMs / 86_400_000);
}

/**
 * Resolves fuzzy-but-explicit language ("tomorrow", "August 18") to an ISO
 * date relative to now. Never invents a date for genuinely vague phrasing —
 * callers must check isFabricatedPreciseDeadline first.
 */
function resolveDeadlineToISO(rawText: string): string | null {
  const now = new Date();
  const lower = rawText.toLowerCase();
  if (lower === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (lower === "today" || lower === "tonight") {
    return now.toISOString().slice(0, 10);
  }
  const parsed = new Date(`${rawText} ${now.getFullYear()}`);
  if (!Number.isNaN(parsed.getTime())) {
    // If the parsed date already passed this year, assume next occurrence.
    if (parsed.getTime() < now.getTime() - 86_400_000 * 2) {
      parsed.setFullYear(parsed.getFullYear() + 1);
    }
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}
