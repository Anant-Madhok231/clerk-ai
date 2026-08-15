import { z } from "zod";

/**
 * Strict shape every AI provider must return. Nothing downstream ever
 * parses free-form prose from the model — invalid output is rejected and
 * retried (see provider.ts) rather than saved.
 */
export const ExtractionSchema = z.object({
  classification: z.enum(["ACTION", "WAITING", "COMPLETED", "INFORMATIONAL"]),
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(500),
  category: z.string().min(1).max(60),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  deadline: z.string().date().nullable(),
  deadlineConfidence: z.number().min(0).max(1).nullable(),
  amount: z.number().nonnegative().nullable(),
  currency: z.string().length(3).nullable(),
  nextAction: z.string().max(300).nullable(),
  waitingOn: z.string().max(120).nullable(),
  confidence: z.number().min(0).max(1),
  relatedSituationId: z.string().nullable(),
  relationshipType: z.enum(["NEW", "UPDATE", "RESOLUTION"]).nullable(),
  resolutionEvidence: z.string().max(300).nullable(),
  requiresUserConfirmation: z.boolean(),
  evidenceSummary: z.string().max(300),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

/** Ambiguous language ("sometime next week") must never produce a fabricated exact date. */
export function isFabricatedPreciseDeadline(rawText: string, deadline: string | null): boolean {
  if (!deadline) return false;
  const vague = /\b(sometime|soon|eventually|next week|in a (few|couple of) (days|weeks))\b/i;
  const hasExplicitDate = /\b(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2})\b/i;
  return vague.test(rawText) && !hasExplicitDate.test(rawText);
}
