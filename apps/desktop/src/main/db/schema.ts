import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const sourceItem = sqliteTable(
  'source_item',
  {
    id: text('id').primaryKey(),
    sourceType: text('source_type').notNull(), // 'gmail' | 'pdf' | 'image' | 'txt' | 'docx' | 'demo'
    provider: text('provider').notNull(),
    providerId: text('provider_id').notNull(), // Gmail message ID, file content hash, demo fixture id, ...
    threadId: text('thread_id'),
    sender: text('sender'),
    subject: text('subject'),
    snippet: text('snippet'),
    receivedAt: text('received_at').notNull(),
    fileName: text('file_name'),
    contentHash: text('content_hash'),
    metadata: text('metadata'), // JSON string; provider-specific extras
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [
    // stops the same gmail message / imported file getting added twice
    uniqueIndex('source_item_provider_id_idx').on(table.provider, table.providerId),
    index('source_item_thread_id_idx').on(table.threadId)
  ]
)

export const situation = sqliteTable('situation', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  status: text('status').notNull(), // SituationStatus
  priority: text('priority').notNull(), // SituationPriority
  category: text('category'),
  nextAction: text('next_action'),
  deadline: text('deadline'),
  deadlineConfidence: real('deadline_confidence'),
  amount: real('amount'),
  currency: text('currency'),
  waitingOn: text('waiting_on'),
  confidence: real('confidence').notNull(),
  userConfirmed: integer('user_confirmed', { mode: 'boolean' }).notNull().default(false),
  calendarEventId: text('calendar_event_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  resolvedAt: text('resolved_at')
})

export const situationSource = sqliteTable(
  'situation_source',
  {
    id: text('id').primaryKey(),
    situationId: text('situation_id')
      .notNull()
      .references(() => situation.id, { onDelete: 'cascade' }),
    sourceItemId: text('source_item_id')
      .notNull()
      .references(() => sourceItem.id, { onDelete: 'cascade' }),
    role: text('role'), // e.g. 'origin' | 'update'
    linkedAt: text('linked_at').notNull()
  },
  (table) => [
    uniqueIndex('situation_source_unique_idx').on(table.situationId, table.sourceItemId),
    index('situation_source_source_item_id_idx').on(table.sourceItemId)
  ]
)

export const situationEvent = sqliteTable(
  'situation_event',
  {
    id: text('id').primaryKey(),
    situationId: text('situation_id')
      .notNull()
      .references(() => situation.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    occurredAt: text('occurred_at').notNull(),
    payload: text('payload') // JSON string
  },
  (table) => [index('situation_event_situation_id_idx').on(table.situationId)]
)

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull()
})
