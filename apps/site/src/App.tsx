import { useState } from 'react'
import { ArrowRight, FileText, GitFork, Lock, Mail, Sparkles, Zap } from 'lucide-react'
import { ClerkMark } from './components/ClerkMark'
import { DemoApp } from './components/DemoApp'
import { DownloadGateModal, type DownloadTarget } from './components/DownloadGateModal'
import styles from './App.module.css'

const REPO_URL = 'https://github.com/Anant-Madhok231/clerk-ai'
const RELEASES_URL = 'https://github.com/Anant-Madhok231/clerk-ai/releases'

// bump this whenever the desktop app version bumps too, only used in the
// beta access request email
const CLERK_VERSION = '1.0.3'

// filenames stay the same across versions so these always point at the
// newest release without editing this file
const DOWNLOAD_MAC_ARM64 = `${RELEASES_URL}/latest/download/Clerk-macOS-arm64.dmg`
const DOWNLOAD_MAC_X64 = `${RELEASES_URL}/latest/download/Clerk-macOS-x64.dmg`
const DOWNLOAD_WINDOWS = `${RELEASES_URL}/latest/download/Clerk-Setup.exe`

const DOWNLOAD_TARGETS: Record<'macArm64' | 'macX64' | 'windows', DownloadTarget> = {
  macArm64: { id: 'mac-arm64', label: 'macOS — Apple Silicon', url: DOWNLOAD_MAC_ARM64 },
  macX64: { id: 'mac-x64', label: 'macOS — Intel', url: DOWNLOAD_MAC_X64 },
  windows: { id: 'windows', label: 'Windows', url: DOWNLOAD_WINDOWS }
}

const BETA_EMAIL_STORAGE_KEY = 'clerk-beta-email'

export function App() {
  const [gateTarget, setGateTarget] = useState<DownloadTarget | null>(null)

  function handleDownloadClick(target: DownloadTarget) {
    // once someone's submitted a request this session, don't ask again,
    // just start the next download
    if (sessionStorage.getItem(BETA_EMAIL_STORAGE_KEY)) {
      window.location.href = target.url
      return
    }
    setGateTarget(target)
  }

  return (
    <>
      <header className="container">
        <nav className={styles.nav}>
          <div className={styles.navBrand}>
            <ClerkMark size={24} />
            Clerk
          </div>
          <div className={styles.navLinks}>
            <a href="#how-it-works">How it works</a>
            <a href="#demo">Demo</a>
            <a href="#download">Download</a>
            <a href={REPO_URL}>GitHub</a>
          </div>
        </nav>
      </header>

      <section className="container">
        <div className={styles.hero}>
          <div className={styles.heroMark}>
            <ClerkMark size={64} />
          </div>
          <h1 className={styles.heroTitle}>Clerk</h1>
          <p className={styles.heroTagline}>Your personal AI admin agent.</p>
          <p className={styles.heroBody}>
            Clerk reads the boring stuff — bills, forms, refunds, deadlines — and tells you what actually needs
            your attention. Everything runs locally on your computer.
          </p>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => handleDownloadClick(DOWNLOAD_TARGETS.macArm64)}
            >
              Download for Mac
            </button>
            <a className={`${styles.button} ${styles.buttonSecondary}`} href="#demo">
              Try Demo
            </a>
            <a className={`${styles.button} ${styles.buttonSecondary}`} href={REPO_URL}>
              <GitFork size={15} /> View on GitHub
            </a>
          </div>
          <p className={styles.heroHint}>
            Apple Silicon. <a href="#download">Windows or Intel Mac?</a>
          </p>
        </div>
      </section>

      <section className="container" id="how-it-works">
        <div className={`${styles.section} ${styles.sectionCentered}`}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <p className={styles.sectionSubtitle}>
            Clerk runs every incoming source through the same ingestion and matching pipeline, so several messages
            about one real-world issue update a single tracked situation instead of creating duplicate tasks.
          </p>
          <div className={styles.flowRow}>
            <div className={styles.flowStep}>
              <div className={styles.flowIcon}>
                <Mail size={24} />
              </div>
              <span className={styles.flowLabel}>Email / Document</span>
            </div>
            <ArrowRight className={styles.flowArrow} />
            <div className={styles.flowStep}>
              <div className={styles.flowIcon}>
                <ClerkMark size={24} />
              </div>
              <span className={styles.flowLabel}>Clerk</span>
            </div>
            <ArrowRight className={styles.flowArrow} />
            <div className={styles.flowStep}>
              <div className={styles.flowIcon}>
                <Zap size={24} />
              </div>
              <span className={styles.flowLabel}>Action / Waiting / Completed</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container" id="demo">
        <div className={`${styles.section} ${styles.sectionCentered}`}>
          <h2 className={styles.sectionTitle}>See it in action</h2>
          <p className={styles.sectionSubtitle}>
            Seeded, static data — no login, no credentials. Click into a situation to see its timeline.
          </p>
          <div className={styles.demoWrap}>
            <DemoApp />
          </div>
          <p className={styles.demoHint}>
            This mirrors the real app's Demo Mode, which runs the same fixtures through Clerk's actual ingestion
            pipeline rather than showing pre-built cards.
          </p>
        </div>
      </section>

      <section className="container">
        <div className={`${styles.section} ${styles.sectionCentered}`}>
          <h2 className={styles.sectionTitle}>Local-first, by design</h2>
          <p className={styles.sectionSubtitle}>
            Clerk keeps your data on your computer, not in the cloud.
          </p>
          <div className={styles.privacyGrid}>
            <div className={styles.privacyCard}>
              <Lock size={20} color="var(--color-accent)" />
              <h3>Local storage</h3>
              <p>Situations, sources, and settings live in a SQLite database on your machine.</p>
            </div>
            <div className={styles.privacyCard}>
              <FileText size={20} color="var(--color-accent)" />
              <h3>Source traceability</h3>
              <p>Every situation links back to the exact email or document it came from.</p>
            </div>
            <div className={styles.privacyCard}>
              <Sparkles size={20} color="var(--color-accent)" />
              <h3>Revocable access</h3>
              <p>Disconnect Gmail or Calendar, or delete all Clerk data, any time from Settings.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container" id="download">
        <div className={`${styles.section} ${styles.sectionCentered}`}>
          <h2 className={styles.sectionTitle}>Download Clerk</h2>
          <p className={styles.sectionSubtitle}>Free, no account required to try Demo Mode.</p>
          <div className={styles.downloadGrid}>
            <div className={styles.downloadCard}>
              <ClerkMark size={32} />
              <h3>Mac — Apple Silicon</h3>
              <p>M1 and later</p>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => handleDownloadClick(DOWNLOAD_TARGETS.macArm64)}
              >
                Download .dmg
              </button>
            </div>
            <div className={styles.downloadCard}>
              <ClerkMark size={32} />
              <h3>Mac — Intel</h3>
              <p>2020 and earlier</p>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => handleDownloadClick(DOWNLOAD_TARGETS.macX64)}
              >
                Download .dmg
              </button>
            </div>
            <div className={styles.downloadCard}>
              <ClerkMark size={32} />
              <h3>Windows</h3>
              <p>Windows 10 &amp; 11</p>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => handleDownloadClick(DOWNLOAD_TARGETS.windows)}
              >
                Download .exe
              </button>
            </div>
          </div>
          <p className={styles.demoHint}>
            Not sure which Mac you have? Apple menu → About This Mac. &quot;Chip&quot; means Apple Silicon;
            &quot;Processor&quot; means Intel.
          </p>
          <p className={styles.demoHint}>
            After submitting your email below, your browser can take 30–45 seconds to actually start the download —
            that's normal, please wait.
          </p>
        </div>
      </section>

      <footer className="container">
        <div className={styles.footer}>
          <span>Clerk — © 2026 Anant Madhok</span>
          <div className={styles.footerLinks}>
            <a href={REPO_URL}>GitHub</a>
            <a href={RELEASES_URL}>Releases</a>
            <a href="/clerk-ai/privacy.html">Privacy</a>
          </div>
        </div>
      </footer>

      {gateTarget && (
        <DownloadGateModal
          target={gateTarget}
          clerkVersion={CLERK_VERSION}
          onClose={() => setGateTarget(null)}
          onSuccess={(email) => sessionStorage.setItem(BETA_EMAIL_STORAGE_KEY, email)}
        />
      )}
    </>
  )
}
