import { useNavigate } from "react-router-dom";
import type { Situation } from "@clerk-ai/core";
import { PriorityBadge, StatusBadge } from "./Badge";
import { formatDeadline, formatMoney } from "../format";

export function SituationCard({ situation }: { situation: Situation }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="card situation-card"
      onClick={() => navigate(`/situation/${situation.id}`)}
      style={{ width: "100%", textAlign: "left" }}
    >
      <div className="situation-card-top">
        <div>
          <p className="situation-title">{situation.title}</p>
          {situation.amount !== null && (
            <div className="situation-meta">{formatMoney(situation.amount, situation.currency)}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <StatusBadge status={situation.status} />
          {situation.status === "ACTION" && <PriorityBadge priority={situation.priority} />}
        </div>
      </div>
      <div className="situation-meta">
        {situation.status === "WAITING" && situation.waitingOn && `Waiting on ${situation.waitingOn}`}
        {situation.status === "ACTION" && situation.deadline && `Due ${formatDeadline(situation.deadline)}`}
        {situation.status === "COMPLETED" &&
          situation.resolvedAt &&
          `Completed ${formatDeadline(situation.resolvedAt.slice(0, 10))}`}
      </div>
    </button>
  );
}
