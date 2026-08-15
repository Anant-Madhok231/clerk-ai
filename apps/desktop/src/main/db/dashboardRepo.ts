import { eq, ne } from "drizzle-orm";
import type { Situation } from "@clerk-ai/core";
import { getDb } from "./client.js";
import { situations } from "./schema.js";
import { rowToSituation } from "./situationRepo.js";

export interface Dashboard {
  needsAttention: Situation[];
  upcoming: Situation[];
  waiting: Situation[];
  recentlyCompleted: Situation[];
}

export async function getDashboard(): Promise<Dashboard> {
  const db = getDb();
  const rows = await db.select().from(situations).where(ne(situations.status, "INFORMATIONAL"));
  const all = rows.map(rowToSituation);

  const actions = all.filter((s) => s.status === "ACTION");
  const waiting = all.filter((s) => s.status === "WAITING");
  const completed = all
    .filter((s) => s.status === "COMPLETED")
    .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""))
    .slice(0, 10);

  const urgentOrHigh = actions.filter((s) => s.priority === "URGENT" || s.priority === "HIGH");
  const rest = actions.filter((s) => s.priority !== "URGENT" && s.priority !== "HIGH");

  return {
    needsAttention: sortByDeadline(urgentOrHigh),
    upcoming: sortByDeadline(rest),
    waiting: sortByDeadline(waiting),
    recentlyCompleted: completed,
  };
}

export async function getSituationsByStatus(status: Situation["status"]): Promise<Situation[]> {
  const db = getDb();
  const rows = await db.select().from(situations).where(eq(situations.status, status));
  return sortByDeadline(rows.map(rowToSituation));
}

function sortByDeadline(list: Situation[]): Situation[] {
  return [...list].sort((a, b) => {
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}
