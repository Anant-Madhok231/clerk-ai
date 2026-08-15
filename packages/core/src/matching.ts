import type { Situation, SourceItem } from "./types.js";

/**
 * Deterministic candidate matching. This runs before any model call so most
 * follow-up emails (same thread, same merchant + order number, etc.) never
 * need an LLM round trip to be reconciled with an existing situation.
 */

export interface MatchCandidate {
  situation: Situation;
  score: number;
  reasons: string[];
}

const REFERENCE_CODE_PATTERN =
  /\b(?:order|confirmation|ticket|application|ref(?:erence)?|case)\s*#?\s*[:#]?\s*([A-Z0-9-]{5,})\b/i;

export function extractReferenceCode(text: string): string | null {
  const match = REFERENCE_CODE_PATTERN.exec(text);
  return match ? match[1]?.toUpperCase() ?? null : null;
}

export function normalizeMerchantKey(sender: string | null | undefined): string | null {
  if (!sender) return null;
  const domainMatch = /@([\w.-]+)/.exec(sender);
  const domain = domainMatch ? domainMatch[1] : sender;
  return domain
    ?.toLowerCase()
    .replace(/^(mail|no-?reply|notifications?|updates?|support)\./, "")
    .replace(/\.(com|net|org|io|co)$/, "") ?? null;
}

function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2)
    );
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface MatchInput {
  source: SourceItem;
  extractedText: string;
  openSituations: Situation[];
}

/**
 * Scores every open (non-COMPLETED, non-INFORMATIONAL-discarded) situation
 * against a new source. Thread ID and reference-code+merchant matches are
 * strong enough to skip AI confirmation; everything else is a hint the
 * agent's classification step can weigh alongside semantic content.
 */
export function findCandidateSituations(input: MatchInput): MatchCandidate[] {
  const { source, extractedText, openSituations } = input;
  const referenceCode = extractReferenceCode(extractedText);
  const merchantKey = normalizeMerchantKey(source.sender);
  const candidates: MatchCandidate[] = [];

  for (const situation of openSituations) {
    if (situation.status === "COMPLETED") continue;
    let score = 0;
    const reasons: string[] = [];

    if (source.threadId && situationHasThread(situation, source.threadId)) {
      score += 0.6;
      reasons.push("same Gmail thread");
    }

    if (referenceCode && situation.referenceCode === referenceCode) {
      score += 0.5;
      reasons.push(`matching reference code ${referenceCode}`);
    }

    if (merchantKey && situation.merchantKey === merchantKey) {
      score += 0.25;
      reasons.push(`same sender (${merchantKey})`);
    }

    const titleSimilarity = jaccardSimilarity(situation.title, extractedText);
    if (titleSimilarity > 0.15) {
      score += titleSimilarity * 0.3;
      reasons.push(`similar wording (${Math.round(titleSimilarity * 100)}%)`);
    }

    if (score > 0) {
      candidates.push({ situation, score: Math.min(score, 1), reasons });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

// Thread membership is tracked via SituationSource + SourceItem in the DB
// layer; this function is a seam so the pure matcher can be unit tested
// without a database by passing in a lightweight lookup.
function situationHasThread(situation: Situation, threadId: string): boolean {
  return (situation as Situation & { _threadIds?: string[] })._threadIds?.includes(threadId) ?? false;
}

/** Threshold above which a candidate is treated as "clearly the same situation" without an AI call. */
export const DETERMINISTIC_MATCH_THRESHOLD = 0.55;

export function bestDeterministicMatch(candidates: MatchCandidate[]): MatchCandidate | null {
  const top = candidates[0];
  if (!top) return null;
  return top.score >= DETERMINISTIC_MATCH_THRESHOLD ? top : null;
}
