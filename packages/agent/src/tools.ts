import type { Situation, SourceItem, SituationEventType } from "@clerk-ai/core";
import type { Extraction } from "./schema.js";

/**
 * The only surface through which the agent can affect application state.
 * The model never generates SQL or touches the database directly - every
 * side effect goes through one of these narrow, validated operations.
 * apps/desktop implements this against SQLite; tests implement it in memory.
 */
export interface SituationTools {
  searchRelatedSituations(source: SourceItem, extractedText: string): Promise<Situation[]>;
  getSituation(id: string): Promise<Situation | null>;
  createSituation(input: CreateSituationInput): Promise<Situation>;
  updateSituation(id: string, patch: UpdateSituationInput): Promise<Situation>;
  addSituationSource(situationId: string, sourceId: string): Promise<void>;
  recordSituationEvent(situationId: string, type: SituationEventType, detail: string): Promise<void>;
  /** Calendar and notifications are suggestions only - no automatic external side effects. */
  suggestCalendarEvent(situationId: string, title: string, date: string): Promise<void>;
  scheduleLocalNotification(situationId: string, message: string): Promise<void>;
}

export interface CreateSituationInput {
  title: string;
  summary: string;
  status: Extraction["classification"];
  priority: Extraction["priority"];
  category: string;
  nextAction: string | null;
  deadline: string | null;
  deadlineConfidence: number | null;
  amount: number | null;
  currency: string | null;
  waitingOn: string | null;
  confidence: number;
  merchantKey: string | null;
  referenceCode: string | null;
  sourceId: string;
}

export type UpdateSituationInput = Partial<
  Omit<CreateSituationInput, "sourceId"> & { resolvedAt: string | null }
>;
