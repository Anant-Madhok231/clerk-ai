import { eq, inArray, ne } from "drizzle-orm";
import { newId } from "@clerk-ai/core";
import type { Situation, SituationEvent, SituationEventType, SourceItem } from "@clerk-ai/core";
import type { CreateSituationInput, SituationTools, UpdateSituationInput } from "@clerk-ai/agent";
import { getDb } from "./client.js";
import { situationEvents, situationSources, situations, sourceItems } from "./schema.js";

type SituationRow = typeof situations.$inferSelect;
type SourceRow = typeof sourceItems.$inferSelect;

export function rowToSituation(row: SituationRow): Situation {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    status: row.status as Situation["status"],
    priority: row.priority as Situation["priority"],
    category: row.category,
    nextAction: row.nextAction,
    deadline: row.deadline,
    deadlineConfidence: row.deadlineConfidence,
    amount: row.amount,
    currency: row.currency,
    waitingOn: row.waitingOn,
    confidence: row.confidence,
    userConfirmed: row.userConfirmed,
    merchantKey: row.merchantKey,
    referenceCode: row.referenceCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resolvedAt: row.resolvedAt,
  };
}

export function rowToSource(row: SourceRow): SourceItem {
  return {
    id: row.id,
    sourceType: row.sourceType as SourceItem["sourceType"],
    provider: row.provider,
    providerId: row.providerId,
    threadId: row.threadId,
    sender: row.sender,
    subject: row.subject,
    snippet: row.snippet,
    receivedAt: row.receivedAt,
    fileName: row.fileName,
    contentHash: row.contentHash,
    metadata: JSON.parse(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Drizzle-backed implementation of the agent's SituationTools port. */
export class SqliteSituationTools implements SituationTools {
  async searchRelatedSituations(_source: SourceItem, _extractedText: string): Promise<Situation[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(situations)
      .where(ne(situations.status, "COMPLETED"));
    return rows.map(rowToSituation);
  }

  async getSituation(id: string): Promise<Situation | null> {
    const db = getDb();
    const rows = await db.select().from(situations).where(eq(situations.id, id));
    return rows[0] ? rowToSituation(rows[0]) : null;
  }

  async createSituation(input: CreateSituationInput): Promise<Situation> {
    const db = getDb();
    const now = new Date().toISOString();
    const id = newId("sit");
    await db.insert(situations).values({
      id,
      title: input.title,
      summary: input.summary,
      status: input.status,
      priority: input.priority,
      category: input.category,
      nextAction: input.nextAction,
      deadline: input.deadline,
      deadlineConfidence: input.deadlineConfidence,
      amount: input.amount,
      currency: input.currency,
      waitingOn: input.waitingOn,
      confidence: input.confidence,
      userConfirmed: false,
      merchantKey: input.merchantKey,
      referenceCode: input.referenceCode,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    });
    await this.addSituationSource(id, input.sourceId);
    const created = await this.getSituation(id);
    if (!created) throw new Error("Failed to read back created situation");
    return created;
  }

  async updateSituation(id: string, patch: UpdateSituationInput): Promise<Situation> {
    const db = getDb();
    await db
      .update(situations)
      .set({ ...stripUndefined(patch), updatedAt: new Date().toISOString() })
      .where(eq(situations.id, id));
    const updated = await this.getSituation(id);
    if (!updated) throw new Error(`Situation ${id} not found after update`);
    return updated;
  }

  async addSituationSource(situationId: string, sourceId: string): Promise<void> {
    const db = getDb();
    await db
      .insert(situationSources)
      .values({ situationId, sourceId, createdAt: new Date().toISOString() })
      .onConflictDoNothing();
  }

  async recordSituationEvent(situationId: string, type: SituationEventType, detail: string): Promise<void> {
    const db = getDb();
    await db.insert(situationEvents).values({
      id: newId("evt"),
      situationId,
      type,
      detail,
      createdAt: new Date().toISOString(),
    });
  }

  async suggestCalendarEvent(_situationId: string, _title: string, _date: string): Promise<void> {
    // Calendar creation itself requires explicit user confirmation and is
    // triggered from the renderer via clerk:addToCalendar, not by the agent.
  }

  async scheduleLocalNotification(_situationId: string, _message: string): Promise<void> {
    // The desktop-notification side effect is layered on in main/pipeline.ts
    // (notifyingTools), which wraps this method rather than living here.
  }
}

export async function getSituationEvents(situationId: string): Promise<SituationEvent[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(situationEvents)
    .where(eq(situationEvents.situationId, situationId));
  return rows.map((r) => ({
    id: r.id,
    situationId: r.situationId,
    type: r.type as SituationEventType,
    detail: r.detail,
    createdAt: r.createdAt,
  }));
}

export async function getSituationSourceItems(situationId: string): Promise<SourceItem[]> {
  const db = getDb();
  const links = await db
    .select()
    .from(situationSources)
    .where(eq(situationSources.situationId, situationId));
  if (links.length === 0) return [];
  const ids = links.map((l) => l.sourceId);
  const rows = await db.select().from(sourceItems).where(inArray(sourceItems.id, ids));
  return rows.map(rowToSource);
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) (result as Record<string, unknown>)[key] = value;
  }
  return result;
}
