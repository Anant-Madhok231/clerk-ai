import { google } from "googleapis";
import type { Credentials } from "google-auth-library";
import { getSecret, setSecret, clearSecret, SecretKeys } from "../secureStore.js";
import { clientFromTokens, isGoogleConfigured, runOAuthFlow } from "./googleAuth.js";
import { getDb } from "../db/client.js";
import { gmailSyncState } from "../db/schema.js";
import { ingestSource } from "../db/sourceRepo.js";
import { processSource } from "../pipeline.js";
import { eq } from "drizzle-orm";

// Read-only: Clerk never deletes, sends, labels, or modifies mail.
const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

const INITIAL_SCAN_DAYS = 30;
const INITIAL_SCAN_MAX_MESSAGES = 100;
const INCREMENTAL_MAX_MESSAGES = 50;

export type GmailStatus = {
  configured: boolean;
  connected: boolean;
  lastSyncedAt: string | null;
};

export async function getGmailStatus(): Promise<GmailStatus> {
  const configured = isGoogleConfigured();
  const tokens = getSecret(SecretKeys.gmailTokens);
  const state = await getSyncStateRow();
  return {
    configured,
    connected: configured && Boolean(tokens),
    lastSyncedAt: state?.lastSyncedAt ?? null,
  };
}

export async function connectGmail(): Promise<void> {
  const { tokens } = await runOAuthFlow(GMAIL_SCOPES);
  setSecret(SecretKeys.gmailTokens, JSON.stringify(tokens));
  await setSyncState({ status: "connected" });
}

export async function disconnectGmail(): Promise<void> {
  clearSecret(SecretKeys.gmailTokens);
  await setSyncState({ status: "disconnected", historyId: null });
}

export async function checkInboxNow(): Promise<{ processed: number; skipped: number }> {
  const tokenJson = getSecret(SecretKeys.gmailTokens);
  if (!tokenJson) throw new Error("Gmail is not connected.");

  const tokens = JSON.parse(tokenJson) as Credentials;
  const auth = clientFromTokens(tokens);
  const gmail = google.gmail({ version: "v1", auth });

  const state = await getSyncStateRow();
  let processed = 0;
  let skipped = 0;

  try {
    const messageIds = state?.historyId
      ? await listMessagesSinceHistory(gmail, state.historyId)
      : await listRecentMessages(gmail);

    for (const id of messageIds) {
      const full = await gmail.users.messages.get({ userId: "me", id, format: "full" });
      const labels = full.data.labelIds ?? [];
      if (labels.includes("SPAM") || labels.includes("TRASH")) {
        skipped += 1;
        continue;
      }

      const { sender, subject, snippet, receivedAt, bodyText } = extractMessage(full.data);
      const { source, isDuplicate } = await ingestSource({
        sourceType: "gmail",
        provider: "gmail",
        providerId: id,
        threadId: full.data.threadId ?? null,
        sender,
        subject,
        snippet: snippet ?? full.data.snippet ?? null,
        receivedAt,
        fileName: null,
        bodyText,
        metadata: { labelIds: labels },
      });

      if (isDuplicate) {
        skipped += 1;
        continue;
      }

      await processSource(source, `${subject ?? ""}\n${bodyText}`.trim());
      processed += 1;
    }

    const profile = await gmail.users.getProfile({ userId: "me" });
    await setSyncState({
      status: "connected",
      historyId: profile.data.historyId ?? state?.historyId ?? null,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    // A stale/invalid historyId (common after >7 days) forces a bounded
    // resync rather than a hard failure.
    if (isHistoryExpiredError(error) && state?.historyId) {
      await setSyncState({ historyId: null });
      return checkInboxNow();
    }
    throw error;
  }

  return { processed, skipped };
}

async function listRecentMessages(gmail: ReturnType<typeof google.gmail>): Promise<string[]> {
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - INITIAL_SCAN_DAYS);
  const query = `after:${Math.floor(afterDate.getTime() / 1000)} -in:spam -in:trash`;

  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: INITIAL_SCAN_MAX_MESSAGES,
  });
  return (res.data.messages ?? []).map((m) => m.id!).filter(Boolean);
}

async function listMessagesSinceHistory(
  gmail: ReturnType<typeof google.gmail>,
  historyId: string
): Promise<string[]> {
  const res = await gmail.users.history.list({
    userId: "me",
    startHistoryId: historyId,
    historyTypes: ["messageAdded"],
    maxResults: INCREMENTAL_MAX_MESSAGES,
  });
  const ids = new Set<string>();
  for (const record of res.data.history ?? []) {
    for (const added of record.messagesAdded ?? []) {
      if (added.message?.id) ids.add(added.message.id);
    }
  }
  return Array.from(ids);
}

function isHistoryExpiredError(error: unknown): boolean {
  const status = (error as { code?: number; status?: number })?.code ?? (error as { status?: number })?.status;
  return status === 404;
}

function extractMessage(message: import("googleapis").gmail_v1.Schema$Message) {
  const headers = message.payload?.headers ?? [];
  const header = (name: string) => headers.find((h) => h.name?.toLowerCase() === name)?.value ?? null;
  const sender = header("from");
  const subject = header("subject");
  const dateHeader = header("date");
  const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : null;
  const bodyText = extractBody(message.payload) || message.snippet || "";
  return { sender, subject, snippet: message.snippet ?? null, receivedAt, bodyText };
}

function extractBody(part: import("googleapis").gmail_v1.Schema$MessagePart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf-8");
  }
  for (const child of part.parts ?? []) {
    const found = extractBody(child);
    if (found) return found;
  }
  return "";
}

async function getSyncStateRow() {
  const db = getDb();
  const rows = await db.select().from(gmailSyncState).limit(1);
  return rows[0] ?? null;
}

async function setSyncState(patch: Partial<{ status: string; historyId: string | null; lastSyncedAt: string }>) {
  const db = getDb();
  const existing = await getSyncStateRow();
  if (existing) {
    await db.update(gmailSyncState).set(patch).where(eq(gmailSyncState.id, existing.id));
  } else {
    await db.insert(gmailSyncState).values({
      status: patch.status ?? "disconnected",
      historyId: patch.historyId ?? null,
      lastSyncedAt: patch.lastSyncedAt ?? null,
    });
  }
}
