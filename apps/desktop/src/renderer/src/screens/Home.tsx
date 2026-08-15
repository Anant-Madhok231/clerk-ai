import { useEffect, useState } from "react";
import { SituationCard } from "../components/SituationCard";
import type { Dashboard } from "../clerkApiTypes";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 18) return "Good afternoon.";
  return "Good evening.";
}

export function Home() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    window.clerk.getDashboard().then(setDashboard);
  }, []);

  if (!dashboard) return <div className="empty-state">Loading...</div>;

  const attentionCount = dashboard.needsAttention.length;
  const hasAnything =
    dashboard.needsAttention.length +
      dashboard.upcoming.length +
      dashboard.waiting.length +
      dashboard.recentlyCompleted.length >
    0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{greeting()}</h1>
        <p className="page-subtitle">
          {attentionCount === 0
            ? "Nothing urgent right now."
            : `${attentionCount} thing${attentionCount === 1 ? "" : "s"} need${attentionCount === 1 ? "s" : ""} your attention.`}
        </p>
      </div>

      {!hasAnything && (
        <div className="empty-state card">
          <p>Clerk hasn't found anything yet.</p>
          <p>Connect Gmail or import a document in Settings to get started.</p>
        </div>
      )}

      {dashboard.needsAttention.length > 0 && (
        <section>
          <h2 className="section-title">Needs attention</h2>
          {dashboard.needsAttention.map((s) => (
            <SituationCard key={s.id} situation={s} />
          ))}
        </section>
      )}

      {dashboard.upcoming.length > 0 && (
        <section>
          <h2 className="section-title">Upcoming</h2>
          {dashboard.upcoming.map((s) => (
            <SituationCard key={s.id} situation={s} />
          ))}
        </section>
      )}

      {dashboard.waiting.length > 0 && (
        <section>
          <h2 className="section-title">Waiting</h2>
          {dashboard.waiting.map((s) => (
            <SituationCard key={s.id} situation={s} />
          ))}
        </section>
      )}

      {dashboard.recentlyCompleted.length > 0 && (
        <section>
          <h2 className="section-title">Recently completed</h2>
          {dashboard.recentlyCompleted.map((s) => (
            <SituationCard key={s.id} situation={s} />
          ))}
        </section>
      )}
    </div>
  );
}
