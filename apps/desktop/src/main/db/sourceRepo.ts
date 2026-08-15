import { eq } from "drizzle-orm";
import { hashContent, newId } from "@clerk-ai/core";
import type { SourceItem } from "@clerk-ai/core";
import { getDb } from "./client.js";
import { sourceItems } from "./schema.js";
import { rowToSource } from "./situationRepo.js";

export interface NewSourceInput {
  sourceType: SourceItem["sourceType"];
  provider: string;
  providerId: string | null;
  threadId: string | null;
  sender: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: string | null;
  fileName: string | null;
  bodyText: string;
  metadata?: Record<string, unknown>;
}

export interface IngestResult {
  source: SourceItem;
  isDuplicate: boolean;
}

/**
 * Deduplicates on a hash of the stable identity of the message (Gmail
 * message ID when available, otherwise file name + content). This is what
 * makes reprocessing the same Gmail message, or re-importing the same file,
 * a no-op instead of a second situation.
 */
export async function ingestSource(input: NewSourceInput): Promise<IngestResult> {
  const db = getDb();
  const identity = input.providerId ?? `${input.fileName ?? ""}:${input.bodyText}`;
  const contentHash = await hashContent(identity);

  const existing = await db.select().from(sourceItems).where(eq(sourceItems.contentHash, contentHash));
  if (existing[0]) {
    return { source: rowToSource(existing[0]), isDuplicate: true };
  }

  const now = new Date().toISOString();
  const id = newId("src");
  await db.insert(sourceItems).values({
    id,
    sourceType: input.sourceType,
    provider: input.provider,
    providerId: input.providerId,
    threadId: input.threadId,
    sender: input.sender,
    subject: input.subject,
    snippet: input.snippet,
    receivedAt: input.receivedAt,
    fileName: input.fileName,
    contentHash,
    metadata: JSON.stringify(input.metadata ?? {}),
    bodyText: input.bodyText,
    createdAt: now,
    updatedAt: now,
  });

  const rows = await db.select().from(sourceItems).where(eq(sourceItems.id, id));
  return { source: rowToSource(rows[0]!), isDuplicate: false };
}

export async function getSourceById(id: string): Promise<SourceItem | null> {
  const db = getDb();
  const rows = await db.select().from(sourceItems).where(eq(sourceItems.id, id));
  return rows[0] ? rowToSource(rows[0]) : null;
}

export async function listDocumentSources(): Promise<SourceItem[]> {
  const db = getDb();
  const rows = await db.select().from(sourceItems).where(eq(sourceItems.sourceType, "document"));
  return rows.map(rowToSource).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSourceBodyText(id: string): Promise<string | null> {
  const db = getDb();
  const rows = await db.select().from(sourceItems).where(eq(sourceItems.id, id));
  return rows[0]?.bodyText ?? null;
}
