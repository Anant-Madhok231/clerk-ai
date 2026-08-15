import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryClient'
import { useToastStore } from '../../lib/toast'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import styles from './SettingsSection.module.css'

export function AccountsSection() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const { data: syncStatus } = useQuery({
    queryKey: queryKeys.syncStatus,
    queryFn: () => window.clerk.getSyncStatus()
  })

  const gmailConnect = useMutation({
    mutationFn: () => window.clerk.gmailConnect(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus })
      showToast('Gmail connected.', 'success')
    },
    onError: (error: Error) => showToast(error.message, 'error')
  })
  const gmailDisconnect = useMutation({
    mutationFn: () => window.clerk.gmailDisconnect(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus })
  })

  const calendarConnect = useMutation({
    mutationFn: () => window.clerk.calendarConnect(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus })
      showToast('Google Calendar connected.', 'success')
    },
    onError: (error: Error) => showToast(error.message, 'error')
  })
  const calendarDisconnect = useMutation({
    mutationFn: () => window.clerk.calendarDisconnect(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus })
  })

  return (
    <section className={styles.section}>
      <p className={styles.heading}>Accounts</p>
      <p className={styles.description}>Connect the services Clerk should read from.</p>
      <div className={styles.card}>
        <div className={styles.row}>
          <div>
            <p className={styles.rowLabel}>
              <span
                className={`${styles.connectedDot} ${syncStatus?.gmailConnected ? styles.connectedDotOn : styles.connectedDotOff}`}
              />
              Gmail
            </p>
            <p className={styles.rowDetail}>
              {syncStatus?.gmailConnected ? 'Connected' : 'Not connected'}
            </p>
          </div>
          {syncStatus?.gmailConnected ? (
            <Button variant="ghost" size="sm" onClick={() => gmailDisconnect.mutate()}>
              Disconnect
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => gmailConnect.mutate()}
              disabled={gmailConnect.isPending}
            >
              {gmailConnect.isPending ? <Spinner size={14} /> : 'Connect Gmail'}
            </Button>
          )}
        </div>
        <div className={styles.row}>
          <div>
            <p className={styles.rowLabel}>
              <span
                className={`${styles.connectedDot} ${syncStatus?.calendarConnected ? styles.connectedDotOn : styles.connectedDotOff}`}
              />
              Google Calendar
            </p>
            <p className={styles.rowDetail}>
              {syncStatus?.calendarConnected ? 'Connected' : 'Not connected'}
            </p>
          </div>
          {syncStatus?.calendarConnected ? (
            <Button variant="ghost" size="sm" onClick={() => calendarDisconnect.mutate()}>
              Disconnect
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => calendarConnect.mutate()}
              disabled={calendarConnect.isPending}
            >
              {calendarConnect.isPending ? <Spinner size={14} /> : 'Connect Calendar'}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
