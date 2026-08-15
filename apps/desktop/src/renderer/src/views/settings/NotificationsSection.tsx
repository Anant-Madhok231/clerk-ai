import type { AppSettingsPatchView, AppSettingsView } from '@shared/ipc-channels'
import { Toggle } from '../../components/ui/Toggle'
import styles from './SettingsSection.module.css'

export function NotificationsSection({
  settings,
  onChange
}: {
  settings: AppSettingsView
  onChange: (patch: AppSettingsPatchView) => void
}) {
  return (
    <section className={styles.section}>
      <p className={styles.heading}>Notifications</p>
      <div className={styles.card}>
        <Toggle
          label="High-priority actions"
          description="Rent, bills, and other urgent items."
          checked={settings.notifications.highPriorityActions}
          onChange={(checked) => onChange({ notifications: { highPriorityActions: checked } })}
        />
        <Toggle
          label="Upcoming deadlines"
          checked={settings.notifications.upcomingDeadlines}
          onChange={(checked) => onChange({ notifications: { upcomingDeadlines: checked } })}
        />
        <Toggle
          label="Resolutions"
          description="When something you were waiting on gets resolved."
          checked={settings.notifications.resolutions}
          onChange={(checked) => onChange({ notifications: { resolutions: checked } })}
        />
      </div>
    </section>
  )
}
