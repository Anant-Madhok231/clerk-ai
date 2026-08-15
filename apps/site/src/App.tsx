import { DemoExplorer } from "./components/DemoExplorer";

const GITHUB_URL = "https://github.com/Anant-Madhok231/clerk-ai";
const RELEASES_URL = `${GITHUB_URL}/releases`;

export function App() {
  return (
    <>
      <header className="container nav">
        <a className="nav-brand" href="#top">
          Clerk
        </a>
        <nav className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#demo">Demo</a>
          <a href="#privacy">Privacy</a>
          <a href="#download">Download</a>
          <a href={GITHUB_URL}>GitHub</a>
        </nav>
      </header>

      <section id="top" className="hero">
        <div className="container">
          <h1>Clerk</h1>
          <p className="tagline">Your personal AI admin agent.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#download">
              Download for macOS
            </a>
            <a className="button button-primary" href="#download">
              Download for Windows
            </a>
            <a className="button" href="#demo">
              Try Demo
            </a>
            <a className="button" href={GITHUB_URL}>
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <section id="how-it-works">
        <div className="container">
          <h2 className="section-title">Email and documents in. Tracked situations out.</h2>
          <p className="section-subtitle">
            Clerk reads what comes in, decides whether it actually matters, and keeps a small set of situations up to
            date instead of leaving you to re-read your inbox.
          </p>
          <div className="pipeline">
            <div className="pipeline-box">Email / Document</div>
            <span className="pipeline-arrow">→</span>
            <div className="pipeline-box">Clerk</div>
          </div>
          <div className="pipeline-outcomes">
            <span className="pipeline-outcome outcome-action">Action</span>
            <span className="pipeline-outcome outcome-waiting">Waiting</span>
            <span className="pipeline-outcome outcome-completed">Completed</span>
            <span className="pipeline-outcome" style={{ background: "#f0efec", color: "#6b675f" }}>
              Informational (hidden)
            </span>
          </div>
        </div>
      </section>

      <section id="demo">
        <div className="container">
          <h2 className="section-title">See it in action</h2>
          <p className="section-subtitle">
            A sample account with realistic situations, including a Waiting → Completed resolution. No sign-in
            required.
          </p>
          <DemoExplorer />
        </div>
      </section>

      <section id="privacy">
        <div className="container">
          <h2 className="section-title">Local-first by design</h2>
          <p className="section-subtitle">
            Clerk is a desktop app. Your data lives on your machine, not in a company's cloud.
          </p>
          <div className="privacy-grid">
            <div className="privacy-card">
              <h3>Local storage</h3>
              <p>Situations and sources are stored in a local SQLite database on your device.</p>
            </div>
            <div className="privacy-card">
              <h3>Read-only Gmail access</h3>
              <p>Clerk requests read-only Gmail access. It never sends, deletes, or modifies your mail.</p>
            </div>
            <div className="privacy-card">
              <h3>Confirmed external actions</h3>
              <p>Calendar events are only created after you explicitly confirm them - never automatically.</p>
            </div>
            <div className="privacy-card">
              <h3>Minimal AI transmission</h3>
              <p>Only the content needed to classify a single message is sent to your chosen AI provider.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="download">
        <div className="container">
          <h2 className="section-title">Download Clerk</h2>
          <p className="section-subtitle">
            Installers are published on GitHub Releases for every tagged version.
          </p>
          <div className="downloads-grid">
            <div className="download-card">
              <h3>macOS</h3>
              <p>Apple Silicon and Intel .dmg builds.</p>
              <a className="button button-primary" href={RELEASES_URL}>
                Go to Releases
              </a>
            </div>
            <div className="download-card">
              <h3>Windows</h3>
              <p>Clerk-Setup-x.x.x.exe installer.</p>
              <a className="button button-primary" href={RELEASES_URL}>
                Go to Releases
              </a>
            </div>
            <div className="download-card">
              <h3>Build from source</h3>
              <p>Clone the repo and run it locally with Node 20+.</p>
              <a className="button" href={GITHUB_URL}>
                View Source
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          Clerk is an open-source project by Anant Madhok. <a href={GITHUB_URL}>GitHub</a> ·{" "}
          <a href={`${GITHUB_URL}/blob/main/LICENSE`}>MIT License</a>
        </div>
      </footer>
    </>
  );
}
