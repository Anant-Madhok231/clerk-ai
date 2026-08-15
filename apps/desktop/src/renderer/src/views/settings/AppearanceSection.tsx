import type { AppSettingsPatchView, AppSettingsView } from '@shared/ipc-channels'
import { useThemeStore } from '../../lib/theme'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import styles from './SettingsSection.module.css'

export function AppearanceSection({
  settings,
  onChange
}: {
  settings: AppSettingsView
  onChange: (patch: AppSettingsPatchView) => void
}) {
  const setThemePreference = useThemeStore((state) => state.setPreference)

  return (
    <section className={styles.section}>
      <p className={styles.heading}>Appearance</p>
      <div className={styles.card}>
        <div className={styles.row}>
          <p className={styles.rowLabel}>Theme</p>
          <SegmentedControl
            value={settings.theme}
            onChange={(theme) => {
              setThemePreference(theme)
              onChange({ theme })
            }}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' }
            ]}
          />
        </div>
      </div>
    </section>
  )
}
