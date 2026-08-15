import { z } from "zod";

/**
 * Domain model for Clerk. These types mirror the SQLite schema in
 * apps/desktop/src/main/db/schema.ts but stay free of any Drizzle or
 * better-sqlite3 dependency so packages/agent and apps/site can share them.
 */

export const SituationStatus = z.enum([
  "ACTION",
  "WAITING",
  "COMPLETED",
  "INFORMATIONAL",
]);
export type SituationStatus = z.infer<typeof SituationStatus>;

export const SituationPriority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export type SituationPriority = z.infer<typeof SituationPriority>;

export const SourceType = z.enum(["gmail", "document"]);
export type SourceType = z.infer<typeof SourceType>;

export const SituationEventType = z.enum([
  "CREATED",
  "SOURCE_ADDED",
  "STATE_CHANGED",
  "DEADLINE_CHANGED",
  "USER_CONFIRMED",
  "CALENDAR_EVENT_CREATED",
  "MARKED_COMPLETE",
]);
export type SituationEventType = z.infer<typeof SituationEventType>;

export interface SourceItem {
  id: string;
  sourceType: SourceType;
  provider: string; // "gmail" | "upload"
  providerId: string | null; // Gmail message ID, or null for documents
  threadId: string | null;
  sender: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: string | null; // ISO timestamp
  fileName: string | null;
  contentHash: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Situation {
  id: string;
  title: string;
  summary: string;
  status: SituationStatus;
  priority: SituationPriority;
  category: string;
  nextAction: string | null;
  deadline: string | null; // ISO date
  deadlineConfidence: number | null;
  amount: number | null;
  currency: string | null;
  waitingOn: string | null;
  confidence: number;
  userConfirmed: boolean;
  merchantKey: string | null; // normalized sender/merchant used for matching
  referenceCode: string | null; // order/ticket/application number if found
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface SituationSource {
  situationId: string;
  sourceId: string;
  createdAt: string;
}

export interface SituationEvent {
  id: string;
  situationId: string;
  type: SituationEventType;
  detail: string;
  createdAt: string;
}

export const CONFIDENCE_THRESHOLDS = {
  established: 0.85,
  needsConfirmation: 0.6,
} as const;

export function confidenceRequiresConfirmation(confidence: number): boolean {
  return confidence < CONFIDENCE_THRESHOLDS.established;
}

export function confidenceIsUnreliable(confidence: number): boolean {
  return confidence < CONFIDENCE_THRESHOLDS.needsConfirmation;
}
