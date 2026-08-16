import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import styles from './DownloadGateModal.module.css'

export interface DownloadTarget {
  id: string
  label: string
  url: string
}

interface DownloadGateModalProps {
  target: DownloadTarget
  clerkVersion: string
  onClose: () => void
  onSuccess: (email: string) => void
}

const FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/amadhok@ucdavis.edu'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function submitBetaAccessRequest(email: string, platformLabel: string, clerkVersion: string): Promise<boolean> {
  const formData = new FormData()
  formData.append('_subject', 'New Clerk Beta User')
  formData.append('_template', 'table')
  // AJAX submissions can't render an interactive captcha challenge, so this
  // is disabled per FormSubmit's own guidance for fetch-based integrations.
  formData.append('_captcha', 'false')
  formData.append('Email', email)
  formData.append('Platform', platformLabel)
  formData.append('Clerk Version', clerkVersion)
  formData.append('Requested At', new Date().toISOString())
  formData.append('Purpose', 'Google integration beta approval')

  const response = await fetch(FORMSUBMIT_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData
  })

  if (!response.ok) return false
  try {
    const data = (await response.json()) as { success?: string | boolean }
    return data?.success === 'true' || data?.success === true
  } catch {
    // A 2xx status without a parseable body is still a reasonable success signal.
    return true
  }
}

type Phase = 'form' | 'submitting' | 'error' | 'success'

export function DownloadGateModal({ target, clerkVersion, onClose, onSuccess }: DownloadGateModalProps) {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && phase !== 'submitting') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, phase])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = email.trim()
    if (!EMAIL_PATTERN.test(trimmed)) {
      setValidationError('Enter a valid email address.')
      return
    }
    setValidationError(null)
    setPhase('submitting')

    const ok = await submitBetaAccessRequest(trimmed, target.label, clerkVersion).catch(() => false)

    if (ok) {
      onSuccess(trimmed)
      window.location.href = target.url
      setPhase('success')
    } else {
      setPhase('error')
    }
  }

  return (
    <div className={styles.overlay} onClick={() => phase !== 'submitting' && onClose()}>
      <div className={styles.card} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        {phase !== 'submitting' && (
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        )}

        {phase !== 'success' && (
          <>
            <h3 className={styles.title}>Download Clerk Beta</h3>
            <p className={styles.body}>
              Clerk is currently in development/beta. Enter the Google account you plan to use with Clerk.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                className={styles.input}
                type="email"
                placeholder="your Google email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={phase === 'submitting'}
                required
              />
              {validationError && <p className={styles.errorText}>{validationError}</p>}
              {phase === 'error' && (
                <p className={styles.errorText}>We couldn&apos;t submit your beta access request. Please try again.</p>
              )}

              <button className={styles.submitButton} type="submit" disabled={phase === 'submitting'}>
                {phase === 'submitting' ? 'Submitting…' : phase === 'error' ? 'Retry' : `Continue to ${target.label} Download`}
              </button>
            </form>

            <p className={styles.finePrint}>
              <strong>Important:</strong> Gmail Sync and Google Calendar Sync will only work with the Google email
              address you submit here, after that account is approved by the Clerk administrator. Use the same
              Google account below that you plan to connect inside Clerk — beta approval is account-specific.
            </p>
            <p className={styles.finePrint}>You can download and use Clerk immediately. Admin approval is only required for Gmail Sync and Google Calendar Sync.</p>
          </>
        )}

        {phase === 'success' && (
          <>
            <h3 className={styles.title}>You&apos;re all set — your download is starting.</h3>
            <div className={styles.successBox}>
              <p className={styles.successLabel}>Google integration approval pending</p>
              <p className={styles.body}>
                Clerk is currently in beta. Gmail Sync and Google Calendar Sync will become available after the
                Clerk administrator approves:
              </p>
              <p className={styles.submittedEmail}>{email.trim()}</p>
              <p className={styles.body}>When connecting Google inside Clerk, use this same account.</p>
            </div>
            <button className={styles.submitButton} onClick={onClose}>
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}
