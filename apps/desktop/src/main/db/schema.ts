import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const sourceItems = sqliteTable("source_items", {
  id: text("id").primaryKey(),
  sourceType: text("source_type").notNull(),
  provider: text("provider").notNull(),
  providerId: text("provider_id"),
  threadId: text("thread_id"),
  sender: text("sender"),
  subject: text("subject"),
  snippet: text("snippet"),
  receivedAt: text("received_at"),
  fileName: text("file_name"),
  contentHash: text("content_hash").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  bodyText: text("body_text").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const situations = sqliteTable("situations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull(),
  priority: text("priority").notNull(),
  category: text("category").notNull(),
  nextAction: text("next_action"),
  deadline: text("deadline"),
  deadlineConfidence: real("deadline_confidence"),
  amount: real("amount"),
  currency: text("currency"),
  waitingOn: text("waiting_on"),
  confidence: real("confidence").notNull(),
  userConfirmed: integer("user_confirmed", { mode: "boolean" }).notNull().default(false),
  merchantKey: text("merchant_key"),
  referenceCode: text("reference_code"),
  calendarEventId: text("calendar_event_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const situationSources = sqliteTable("situation_sources", {
  situationId: text("situation_id").notNull(),
  sourceId: text("source_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const situationEvents = sqliteTable("situation_events", {
  id: text("id").primaryKey(),
  situationId: text("situation_id").notNull(),
  type: text("type").notNull(),
  detail: text("detail").notNull(),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const gmailSyncState = sqliteTable("gmail_sync_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  historyId: text("history_id"),
  lastSyncedAt: text("last_synced_at"),
  status: text("status").notNull().default("disconnected"),
});
