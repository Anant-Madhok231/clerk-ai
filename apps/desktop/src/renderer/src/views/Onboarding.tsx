import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Mail, Sparkles } from 'lucide-react'
import type { AppSettingsView } from '@shared/ipc-channels'
import { queryKeys } from '../lib/queryClient'
import { useToastStore } from '../lib/toast'
import { useNavStore } from '../lib/nav'
import { ClerkMark } from '../components/ui/ClerkMark'
import { Button } from '../components/ui/Button'
import { Toggle } from '../components/ui/Toggle'
import styles from './Onboarding.module.css'

const CATEGORY_LABELS: Record<keyof AppSettingsView['categories'], string> = {
  bills: 'Bills and payments',
  deadlines: 'Deadlines',
  forms: 'Forms requiring action',
  appointments: 'Appointments',
  applications: 'Applications',
  refunds: 'Refunds and returns',
  waitingOn: "Things I'm waiting on"
}

function StepDots({ step }: { step: number }) {
  return (
    <div className={styles.stepDots}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`${styles.dot} ${i === step ? styles.dotActive : ''}`} />
      ))}
    </div>
  )
}

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<AppSettingsView['categories']>({
    bills: true,
    deadlines: true,
    forms: true,
    appointments: true,
    applications: true,
    refunds: true,
    waitingOn: true
  })
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)
  const goTo = useNavStore((state) => state.goTo)

  const connectGmail = useMutation({
    mutationFn: () => window.clerk.gmailConnect(),
    onSuccess: () => showToast('Gmail connected.', 'success'),
    onError: (error: Error) => showToast(error.message, 'error')
  })
  const connectCalendar = useMutation({
    mutationFn: () => window.clerk.calendarConnect(),
    onSuccess: () => showToast('Google Calendar connected.', 'success'),
    onError: (error: Error) => showToast(error.message, 'error')
  })

  const finish = useMutation({
    mutationFn: async () => {
      await window.clerk.updateSettings({ categories, onboardingCompleted: true })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings })
      goTo('home')
    }
  })

  if (step === 0) {
    return (
      <div className={styles.screen}>
        <div className={styles.content}>
          <ClerkMark size={56} />
          <p className={styles.title}>Welcome to Clerk</p>
          <p className={styles.tagline}>Your personal AI admin agent.</p>
          <p className={styles.body}>
            Clerk finds the things in your email and documents that actually need your attention and keeps track
            of them for you.
          </p>
          <div className={styles.footer}>
            <Button variant="primary" onClick={() => setStep(1)}>
              Get Started
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className={styles.screen}>
        <div className={styles.content}>
          <StepDots step={1} />
          <p className={styles.title}>Connect your accounts</p>
          <p className={styles.body}>
            Clerk reads Gmail to find things that need your attention, and can add deadlines to your calendar once
            you confirm them.
          </p>
          <div className={styles.connectList}>
            <div className={styles.connectRow}>
              <span className={styles.connectLabel}>
                <span className={styles.connectIcon}>
                  <Mail size={16} />
                </span>
                Gmail
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => connectGmail.mutate()}
                disabled={connectGmail.isPending}
              >
                Connect
              </Button>
            </div>
            <div className={styles.connectRow}>
              <span className={styles.connectLabel}>
                <span className={styles.connectIcon}>
                  <Calendar size={16} />
                </span>
                Google Calendar
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => connectCalendar.mutate()}
                disabled={connectCalendar.isPending}
              >
                Connect
              </Button>
            </div>
          </div>
          <div className={styles.footer}>
            <Button variant="primary" onClick={() => setStep(2)}>
              Continue
            </Button>
            <button className={styles.skipLink} onClick={() => setStep(2)}>
              <Sparkles size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
              Skip and try the demo instead
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <StepDots step={2} />
        <p className={styles.title}>What should Clerk look for?</p>
        <div className={styles.categoryGrid}>
          {(Object.keys(CATEGORY_LABELS) as Array<keyof AppSettingsView['categories']>).map((key) => (
            <Toggle
              key={key}
              label={CATEGORY_LABELS[key]}
              checked={categories[key]}
              onChange={(checked) => setCategories((prev) => ({ ...prev, [key]: checked }))}
            />
          ))}
        </div>
        <div className={styles.footer}>
          <Button variant="primary" onClick={() => finish.mutate()} disabled={finish.isPending}>
            Start Clerk
          </Button>
        </div>
      </div>
    </div>
  )
}
