import { useState } from "react";

type Step = "welcome" | "connect" | "categories" | "scanning";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [gmailConnected, setGmailConnected] = useState(false);

  async function finish() {
    if (!gmailConnected) {
      await window.clerk.seedDemoData();
    }
    await window.clerk.completeOnboarding();
    onDone();
  }

  async function handleConnectGmail() {
    try {
      await window.clerk.connectGmail();
      setGmailConnected(true);
    } catch {
      // Falls back to Demo Mode; the Settings screen surfaces the real error.
    }
  }

  async function handleStart() {
    if (gmailConnected) {
      setStep("scanning");
      try {
        await window.clerk.checkInboxNow();
      } catch {
        // handled by Gmail status indicator afterward
      }
      await window.clerk.completeOnboarding();
      onDone();
    } else {
      await finish();
    }
  }

  return (
    <div className="onboarding">
      <div className="card onboarding-card">
        {step === "welcome" && (
          <>
            <h1 className="onboarding-title">Welcome to Clerk</h1>
            <p className="onboarding-body">
              Clerk finds the things in your email and documents that actually need your attention, and keeps track
              of them for you.
            </p>
            <button type="button" className="button button-primary" onClick={() => setStep("connect")}>
              Get Started
            </button>
          </>
        )}

        {step === "connect" && (
          <>
            <h1 className="onboarding-title">Connect your accounts</h1>
            <p className="onboarding-body">
              Clerk reads your recent messages to find things you need to act on. It never sends email, deletes
              anything, or changes your inbox.
            </p>
            <div className="button-row" style={{ justifyContent: "center", marginBottom: 12 }}>
              <button type="button" className="button button-primary" onClick={handleConnectGmail}>
                {gmailConnected ? "Gmail Connected" : "Connect Gmail"}
              </button>
              <button type="button" className="button" onClick={() => window.clerk.connectCalendar()}>
                Connect Google Calendar
              </button>
            </div>
            <button type="button" className="button" onClick={() => setStep("categories")} style={{ marginRight: 8 }}>
              Skip
            </button>
            <button type="button" className="button button-primary" onClick={() => setStep("categories")}>
              Continue
            </button>
          </>
        )}

        {step === "categories" && (
          <>
            <h1 className="onboarding-title">What should Clerk look for?</h1>
            <div style={{ textAlign: "left", margin: "0 auto 20px", maxWidth: 320 }}>
              {[
                "Bills and payments",
                "Deadlines",
                "Forms requiring action",
                "Appointments",
                "Applications",
                "Refunds and returns",
                "Things I'm waiting on",
              ].map((label) => (
                <div className="checkbox-row" key={label}>
                  <input type="checkbox" defaultChecked id={label} />
                  <label htmlFor={label}>{label}</label>
                </div>
              ))}
            </div>
            <button type="button" className="button button-primary" onClick={handleStart}>
              Start Clerk
            </button>
            {!gmailConnected && (
              <p className="confidence-note" style={{ marginTop: 12 }}>
                No Gmail connected - Clerk will start with sample data so you can see how it works.
              </p>
            )}
          </>
        )}

        {step === "scanning" && (
          <>
            <h1 className="onboarding-title">Looking through recent messages...</h1>
            <p className="onboarding-body">This only takes a moment.</p>
          </>
        )}
      </div>
    </div>
  );
}
