import type { Situation } from "@clerk-ai/core";

export function PriorityBadge({ priority }: { priority: Situation["priority"] }) {
  return <span className={`badge badge-${priority.toLowerCase()}`}>{priority}</span>;
}

export function StatusBadge({ status }: { status: Situation["status"] }) {
  if (status === "WAITING") return <span className="badge badge-waiting">Waiting</span>;
  if (status === "COMPLETED") return <span className="badge badge-completed">Completed</span>;
  return null;
}

export function DemoBadge() {
  return <span className="badge badge-demo">Sample data</span>;
}
