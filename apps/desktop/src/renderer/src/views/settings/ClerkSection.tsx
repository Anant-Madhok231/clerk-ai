import type { AppSettingsPatchView, AppSettingsView } from '@shared/ipc-channels'
import { Toggle } from '../../components/ui/Toggle'
import styles from './SettingsSection.module.css'

const CATEGORY_LABELS: Record<keyof AppSettingsView['categories'], string> = {
  bills: 'Bills and payments',
  deadlines: 'Deadlines',
  forms: 'Forms requiring action',
  appointments: 'Appointments',
  applications: 'Applications',
  refunds: 'Refunds and returns',
  waitingOn: "Things I'm waiting on"
}

export function ClerkSection({
  settings,
  onChange
}: {
  settings: AppSettingsView
  onChange: (patch: AppSettingsPatchView) => void
}) {
  return (
    <section className={styles.section}>
      <p className={styles.heading}>What Clerk looks for</p>
      <p className={styles.description}>Turn off categories you don't want Clerk tracking.</p>
      <div className={styles.card}>
        {(Object.keys(CATEGORY_LABELS) as Array<keyof AppSettingsView['categories']>).map((key) => (
          <Toggle
            key={key}
            label={CATEGORY_LABELS[key]}
            checked={settings.categories[key]}
            onChange={(checked) => onChange({ categories: { [key]: checked } })}
          />
        ))}
      </div>

      <p className={styles.heading} style={{ marginTop: 'var(--space-6)' }}>
        Monitoring
      </p>
      <div className={styles.card}>
        <Toggle
          label="Background monitoring"
          description="Let Clerk check Gmail periodically, even when the window is closed."
          checked={settings.backgroundMonitoringEnabled}
          onChange={(checked) => onChange({ backgroundMonitoringEnabled: checked })}
        />
      </div>
    </section>
  )
}
