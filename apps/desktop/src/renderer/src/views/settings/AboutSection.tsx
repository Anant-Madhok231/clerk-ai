import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryClient'
import { ClerkMark } from '../../components/ui/ClerkMark'
import styles from './SettingsSection.module.css'

export function AboutSection() {
  const { data: appInfo } = useQuery({ queryKey: queryKeys.appInfo, queryFn: () => window.clerk.getAppInfo() })

  return (
    <section className={styles.section}>
      <p className={styles.heading}>About</p>
      <div className={styles.card}>
        <div className={styles.row} style={{ gap: 'var(--space-3)' }}>
          <ClerkMark size={32} />
          <div>
            <p className={styles.rowLabel}>Clerk {appInfo ? `v${appInfo.version}` : ''}</p>
            <p className={styles.rowDetail}>Your personal AI admin agent.</p>
          </div>
        </div>
        {appInfo && (
          <div className={styles.row}>
            <button className={styles.aboutLink} onClick={() => window.clerk.openExternal(appInfo.repositoryUrl)}>
              View on GitHub
            </button>
            <button className={styles.aboutLink} onClick={() => window.clerk.openExternal(appInfo.websiteUrl)}>
              Website
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
