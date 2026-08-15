import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PriorityBadge, StatusBadge } from "../components/Badge";
import { formatDeadline, formatMoney } from "../format";
import type { SituationDetail as SituationDetailData } from "../clerkApiTypes";

export function SituationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<SituationDetailData | null>(null);
  const [showCalendarConfirm, setShowCalendarConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    window.clerk.getSituation(id).then(setDetail).catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  if (error) {
    return (
      <div className="empty-state card">
        <p>{error}</p>
        <button type="button" className="button" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  if (!detail) return <div className="empty-state">Loading...</div>;
  const { situation, events, sources } = detail;
  const primarySource = sources[0];
  const needsConfirmation = situation.confidence < 0.85 && !situation.userConfirmed;

  async function markComplete() {
    if (!id) return;
    setBusy(true);
    try {
      await window.clerk.markComplete(id);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function confirmDetails() {
    if (!id) return;
    setBusy(true);
    try {
      await window.clerk.confirmSituation(id);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function confirmCalendarAdd() {
    if (!id) return;
    setBusy(true);
    try {
      await window.clerk.addToCalendar(id, true);
      setShowCalendarConfirm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to calendar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="button" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        Back
      </button>

      <div className="page-header">
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <StatusBadge status={situation.status} />
          {situation.status === "ACTION" && <PriorityBadge priority={situation.priority} />}
        </div>
        <h1 className="page-title">{situation.title}</h1>
      </div>

      {situation.amount !== null && (
        <div className="detail-field">
          <div className="detail-label">Amount</div>
          <div className="detail-value">{formatMoney(situation.amount, situation.currency)}</div>
        </div>
      )}

      {situation.deadline && (
        <div className="detail-field">
          <div className="detail-label">Deadline</div>
          <div className="detail-value">
            {formatDeadline(situation.deadline)}
            {situation.deadlineConfidence !== null && situation.deadlineConfidence < 0.85 && (
              <div className="confidence-note">Possible deadline. Please confirm.</div>
            )}
          </div>
        </div>
      )}

      {situation.status === "WAITING" && situation.waitingOn && (
        <div className="detail-field">
          <div className="detail-label">Waiting on</div>
          <div className="detail-value">{situation.waitingOn}</div>
        </div>
      )}

      <div className="detail-field">
        <div className="detail-label">What Clerk found</div>
        <div className="detail-value">{situation.summary}</div>
      </div>

      {situation.nextAction && (
        <div className="detail-field">
          <div className="detail-label">What you need to do</div>
          <div className="detail-value">{situation.nextAction}</div>
        </div>
      )}

      {primarySource && (
        <div className="detail-field">
          <div className="detail-label">Detected from</div>
          <div className="detail-value">
            {primarySource.sender ?? primarySource.fileName}
            {primarySource.subject && <div className="situation-meta">"{primarySource.subject}"</div>}
            <div className="situation-meta">
              {primarySource.receivedAt && new Date(primarySource.receivedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {needsConfirmation && (
        <div className="card" style={{ marginBottom: 16, background: "var(--medium-soft)" }}>
          <p style={{ margin: 0 }}>Clerk isn't fully confident about these details. Please confirm they're correct.</p>
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={confirmDetails} disabled={busy}>
              Confirm details
            </button>
          </div>
        </div>
      )}

      <div className="button-row">
        {primarySource && (
          <button type="button" className="button" onClick={() => window.clerk.openSource(primarySource.id)}>
            {primarySource.sourceType === "gmail" ? "View Original Email" : "Open Document"}
          </button>
        )}
        {situation.deadline && situation.status === "ACTION" && (
          <button type="button" className="button" onClick={() => setShowCalendarConfirm(true)}>
            Add Deadline to Calendar
          </button>
        )}
        {situation.status !== "COMPLETED" && (
          <button type="button" className="button button-primary" onClick={markComplete} disabled={busy}>
            Mark Complete
          </button>
        )}
      </div>

      {events.length > 0 && (
        <>
          <h2 className="section-title">Timeline</h2>
          <div className="card">
            {events
              .slice()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((event) => (
                <div key={event.id} className="timeline-item">
                  <div className="timeline-date">{new Date(event.createdAt).toLocaleString()}</div>
                  <div>{event.detail}</div>
                </div>
              ))}
          </div>
        </>
      )}

      {showCalendarConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3 style={{ marginTop: 0 }}>Add to Google Calendar?</h3>
            <p>
              {situation.title}
              <br />
              {situation.deadline && formatDeadline(situation.deadline)}
            </p>
            <div className="button-row">
              <button type="button" className="button" onClick={() => setShowCalendarConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="button button-primary" onClick={confirmCalendarAdd} disabled={busy}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
