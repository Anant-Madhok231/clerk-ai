import { google } from "googleapis";
import type { Credentials } from "google-auth-library";
import { eq } from "drizzle-orm";
import { getSecret, setSecret, clearSecret, SecretKeys } from "../secureStore.js";
import { clientFromTokens, isGoogleConfigured, runOAuthFlow } from "./googleAuth.js";
import { getDb } from "../db/client.js";
import { situations } from "../db/schema.js";
import { rowToSituation } from "../db/situationRepo.js";

const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

export async function getCalendarStatus(): Promise<{ configured: boolean; connected: boolean }> {
  return {
    configured: isGoogleConfigured(),
    connected: isGoogleConfigured() && Boolean(getSecret(SecretKeys.calendarTokens)),
  };
}

export async function connectCalendar(): Promise<void> {
  const { tokens } = await runOAuthFlow(CALENDAR_SCOPES);
  setSecret(SecretKeys.calendarTokens, JSON.stringify(tokens));
}

export async function disconnectCalendar(): Promise<void> {
  clearSecret(SecretKeys.calendarTokens);
}

/**
 * Creates a calendar event for a situation's deadline. Callers must have
 * already shown the user a confirmation dialog - this function performs the
 * external side effect unconditionally once invoked. Duplicate creation is
 * prevented by checking situations.calendarEventId first.
 */
export async function addSituationToCalendar(situationId: string): Promise<string> {
  const db = getDb();
  const rows = await db.select().from(situations).where(eq(situations.id, situationId));
  const row = rows[0];
  if (!row) throw new Error("Situation not found");
  const situation = rowToSituation(row);

  if (row.calendarEventId) return row.calendarEventId;
  if (!situation.deadline) throw new Error("This situation has no deadline to add.");

  const tokenJson = getSecret(SecretKeys.calendarTokens);
  if (!tokenJson) throw new Error("Google Calendar is not connected.");
  const tokens = JSON.parse(tokenJson) as Credentials;
  const auth = clientFromTokens(tokens);
  const calendar = google.calendar({ version: "v3", auth });

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: situation.title,
      description: situation.summary,
      start: { date: situation.deadline },
      end: { date: situation.deadline },
    },
  });

  const eventId = event.data.id ?? "";
  await db.update(situations).set({ calendarEventId: eventId }).where(eq(situations.id, situationId));
  return eventId;
}
