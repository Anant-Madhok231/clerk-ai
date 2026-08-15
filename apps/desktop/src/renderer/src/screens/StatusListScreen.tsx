import { useEffect, useState } from "react";
import type { Situation } from "@clerk-ai/core";
import { SituationCard } from "../components/SituationCard";

export function StatusListScreen({
  status,
  title,
  subtitle,
  emptyMessage,
}: {
  status: Situation["status"];
  title: string;
  subtitle: string;
  emptyMessage: string;
}) {
  const [items, setItems] = useState<Situation[] | null>(null);

  useEffect(() => {
    setItems(null);
    window.clerk.getSituationsByStatus(status).then((data) => setItems(data as Situation[]));
  }, [status]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {items === null && <div className="empty-state">Loading...</div>}
      {items?.length === 0 && <div className="empty-state card">{emptyMessage}</div>}
      {items?.map((s) => (
        <SituationCard key={s.id} situation={s} />
      ))}
    </div>
  );
}
