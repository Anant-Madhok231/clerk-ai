import { useState } from "react";
import { DEMO_SITUATIONS, type DemoSituation, type Status } from "../demoData";

const TABS: { key: "all" | Status; label: string }[] = [
  { key: "all", label: "Home" },
  { key: "ACTION", label: "Actions" },
  { key: "WAITING", label: "Waiting" },
  { key: "COMPLETED", label: "History" },
];

function Badge({ situation }: { situation: DemoSituation }) {
  if (situation.status === "WAITING") return <span className="badge badge-waiting">Waiting</span>;
  if (situation.status === "COMPLETED") return <span className="badge badge-completed">Completed</span>;
  return <span className={`badge badge-${situation.priority.toLowerCase()}`}>{situation.priority}</span>;
}

export function DemoExplorer() {
  const [tab, setTab] = useState<"all" | Status>("all");
  const [selected, setSelected] = useState<DemoSituation | null>(null);

  const items = tab === "all" ? DEMO_SITUATIONS : DEMO_SITUATIONS.filter((s) => s.status === tab);

  return (
    <div className="demo-shell">
      <div className="demo-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`demo-tab${tab === t.key ? " active" : ""}`}
            onClick={() => {
              setTab(t.key);
              setSelected(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="demo-body">
        <div className="demo-sample-banner">This is sample data - no account or sign-in required.</div>

        {selected ? (
          <SituationDetail situation={selected} onBack={() => setSelected(null)} />
        ) : (
          items.map((s) => (
            <button
              key={s.id}
              type="button"
              className="demo-card"
              style={{ width: "100%", textAlign: "left" }}
              onClick={() => setSelected(s)}
            >
              <div className="demo-card-top">
                <p className="demo-card-title">{s.title}</p>
                <Badge situation={s} />
              </div>
              <div className="demo-meta">
                {s.amount !== null && `$${s.amount.toFixed(2)} `}
                {s.deadlineLabel ?? (s.waitingOn ? `Waiting on ${s.waitingOn}` : "")}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function SituationDetail({ situation, onBack }: { situation: DemoSituation; onBack: () => void }) {
  return (
    <div>
      <button type="button" className="detail-back" onClick={onBack}>
        ← Back
      </button>
      <h3 style={{ margin: "0 0 12px" }}>{situation.title}</h3>

      {situation.amount !== null && (
        <div className="detail-field">
          <div className="detail-label">Amount</div>
          <div>${situation.amount.toFixed(2)}</div>
        </div>
      )}
      {situation.deadlineLabel && (
        <div className="detail-field">
          <div className="detail-label">Deadline</div>
          <div>{situation.deadlineLabel}</div>
        </div>
      )}
      {situation.waitingOn && (
        <div className="detail-field">
          <div className="detail-label">Waiting on</div>
          <div>{situation.waitingOn}</div>
        </div>
      )}
      <div className="detail-field">
        <div className="detail-label">What Clerk found</div>
        <div>{situation.summary}</div>
      </div>
      {situation.nextAction && (
        <div className="detail-field">
          <div className="detail-label">What you need to do</div>
          <div>{situation.nextAction}</div>
        </div>
      )}
      <div className="detail-field">
        <div className="detail-label">Detected from</div>
        <div>
          {situation.detectedFrom}
          <div className="demo-meta">"{situation.detectedSubject}" — {situation.detectedDate}</div>
        </div>
      </div>
      <div className="detail-field">
        <div className="detail-label">Why Clerk flagged this</div>
        <div className="demo-meta">{situation.evidence}</div>
      </div>
      <div className="detail-field">
        <div className="detail-label">Timeline</div>
        {situation.timeline.map((event, i) => (
          <div key={i} className="demo-meta" style={{ marginBottom: 4 }}>
            {event.date} — {event.detail}
          </div>
        ))}
      </div>
    </div>
  );
}
