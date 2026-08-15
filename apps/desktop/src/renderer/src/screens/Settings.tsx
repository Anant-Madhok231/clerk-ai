import { useEffect, useState } from "react";

interface SettingsState {
  categories: Record<string, boolean>;
  backgroundMonitoring: boolean;
  scanIntervalMinutes: number;
  theme: "system" | "light" | "dark";
  aiProvider: "demo" | "openai";
  notifications: Record<string, boolean>;
}

const CATEGORY_LABELS: Record<string, string> = {
  bills: "Bills and payments",
  deadlines: "Deadlines",
  forms: "Forms requiring action",
  appointments: "Appointments",
  applications: "Applications",
  refunds: "Refunds and returns",
  waiting: "Things I'm waiting on",
};

const NOTIFICATION_LABELS: Record<string, string> = {
  highPriorityActions: "New high-priority actions",
  approachingDeadlines: "Approaching deadlines",
  completedWaiting: "Completed waiting items",
};

export function Settings() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [gmailStatus, setGmailStatus] = useState<{ configured: boolean; connected: boolean; lastSyncedAt: string | null } | null>(null);
  const [aiStatus, setAiStatus] = useState<{ provider: string; hasApiKey: boolean } | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = () => {
    window.clerk.getSettings().then((s) => setSettings(s as unknown as SettingsState));
    window.clerk.getGmailStatus().then(setGmailStatus);
    window.clerk.getAiProviderStatus().then(setAiStatus);
  };

  useEffect(refresh, []);

  if (!settings) return <div className="empty-state">Loading...</div>;

  async function save(patch: Partial<SettingsState>) {
    const updated = await window.clerk.updateSettings(patch);
    setSettings(updated as unknown as SettingsState);
  }

  async function handleConnectGmail() {
    setMessage("Opening Google sign-in in your browser...");
    try {
      await window.clerk.connectGmail();
      setMessage("Gmail connected.");
      refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not connect Gmail.");
    }
  }

  async function handleSaveApiKey() {
    if (!apiKeyInput.trim()) return;
    await window.clerk.setApiKey(apiKeyInput.trim());
    setApiKeyInput("");
    refresh();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <section className="settings-section">
        <h2 className="section-title">Accounts</h2>
        <div className="card">
          <div className="settings-row">
            <div>
              <strong>Gmail</strong>
              <div className="situation-meta">
                {!gmailStatus?.configured
                  ? "Google OAuth credentials aren't configured for this build."
                  : gmailStatus.connected
                    ? `Connected${gmailStatus.lastSyncedAt ? ` - last checked ${new Date(gmailStatus.lastSyncedAt).toLocaleString()}` : ""}`
                    : "Not connected"}
              </div>
            </div>
            {gmailStatus?.configured &&
              (gmailStatus.connected ? (
                <button type="button" className="button" onClick={() => window.clerk.disconnectGmail().then(refresh)}>
                  Disconnect
                </button>
              ) : (
                <button type="button" className="button button-primary" onClick={handleConnectGmail}>
                  Connect Gmail
                </button>
              ))}
          </div>
          <div className="settings-row">
            <div>
              <strong>Google Calendar</strong>
              <div className="situation-meta">Used only when you confirm adding a deadline.</div>
            </div>
            <button type="button" className="button" onClick={() => window.clerk.connectCalendar().then(refresh)}>
              Connect Calendar
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title">Clerk</h2>
        <div className="card">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <div className="checkbox-row" key={key}>
              <input
                type="checkbox"
                id={`cat-${key}`}
                checked={settings.categories[key] ?? false}
                onChange={(e) => save({ categories: { ...settings.categories, [key]: e.target.checked } })}
              />
              <label htmlFor={`cat-${key}`}>{label}</label>
            </div>
          ))}
          <div className="settings-row">
            <span>Background monitoring</span>
            <input
              type="checkbox"
              checked={settings.backgroundMonitoring}
              onChange={(e) => save({ backgroundMonitoring: e.target.checked })}
              aria-label="Background monitoring"
            />
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title">Notifications</h2>
        <div className="card">
          {Object.entries(NOTIFICATION_LABELS).map(([key, label]) => (
            <div className="settings-row" key={key}>
              <span>{label}</span>
              <input
                type="checkbox"
                checked={settings.notifications[key] ?? false}
                onChange={(e) => save({ notifications: { ...settings.notifications, [key]: e.target.checked } })}
                aria-label={label}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title">Appearance</h2>
        <div className="card">
          <div className="settings-row">
            <span>Theme</span>
            <select value={settings.theme} onChange={(e) => save({ theme: e.target.value as SettingsState["theme"] })}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title">AI</h2>
        <div className="card">
          <div className="settings-row">
            <span>Current provider</span>
            <strong>{aiStatus?.provider === "openai" ? "OpenAI (your key)" : "Demo Mode"}</strong>
          </div>
          <p className="situation-meta">
            Demo Mode runs entirely offline with deterministic rules - no data leaves your computer. Add an OpenAI API
            key to use a real model for classification instead.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              type="password"
              placeholder="sk-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
              aria-label="OpenAI API key"
            />
            <button type="button" className="button button-primary" onClick={handleSaveApiKey}>
              Save Key
            </button>
          </div>
          {aiStatus?.hasApiKey && (
            <button
              type="button"
              className="button"
              style={{ marginTop: 8 }}
              onClick={() => window.clerk.clearApiKey().then(refresh)}
            >
              Remove key and use Demo Mode
            </button>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title">Privacy</h2>
        <div className="card">
          <p>
            Clerk only accesses the services you connect, stores its data locally on this device, and keeps every
            situation traceable to its source. Only the content needed to classify a message is sent to your chosen
            AI provider.
          </p>
          {!confirmDelete ? (
            <button type="button" className="button" onClick={() => setConfirmDelete(true)}>
              Delete Clerk Data
            </button>
          ) : (
            <div className="button-row">
              <span>This permanently deletes all situations, sources, and connected accounts. Are you sure?</span>
              <button
                type="button"
                className="button button-primary"
                onClick={() => window.clerk.deleteAllData().then(() => window.location.reload())}
              >
                Yes, delete everything
              </button>
              <button type="button" className="button" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-title">About</h2>
        <div className="card">
          <p>
            <strong>Clerk</strong> — your personal AI admin agent.
            <br />
            Version 1.0.0
          </p>
          <div className="button-row">
            <button type="button" className="button" onClick={() => window.clerk.openExternal("https://github.com/Anant-Madhok231/clerk-ai")}>
              GitHub
            </button>
            <button type="button" className="button" onClick={() => window.clerk.openExternal("https://Anant-Madhok231.github.io/clerk-ai/")}>
              Website
            </button>
          </div>
        </div>
      </section>

      {message && <p className="page-subtitle">{message}</p>}
    </div>
  );
}
