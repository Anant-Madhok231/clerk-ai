import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryClient'
import { useToastStore } from '../../lib/toast'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import styles from './SettingsSection.module.css'

export function PrivacySection() {
  const [confirming, setConfirming] = useState(false)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const deleteAll = useMutation({
    mutationFn: () => window.clerk.deleteAllData(),
    onSuccess: () => {
      setConfirming(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.situations })
      showToast('All Clerk data deleted.', 'success')
    }
  })

  return (
    <section className={styles.section}>
      <p className={styles.heading}>Privacy</p>
      <p className={styles.description}>
        Clerk keeps everything it tracks in a local database on this computer. Account connections and app
        preferences are not affected by deleting your data.
      </p>
      <div className={styles.card}>
        <div className={styles.row}>
          <div>
            <p className={styles.rowLabel}>Delete Clerk data</p>
            <p className={styles.rowDetail}>Permanently removes every tracked situation and source.</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
            Delete
          </Button>
        </div>
      </div>

      {confirming && (
        <Dialog
          title="Delete all Clerk data?"
          onClose={() => setConfirming(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => deleteAll.mutate()} disabled={deleteAll.isPending}>
                Delete everything
              </Button>
            </>
          }
        >
          This permanently removes every situation, source, and event Clerk has tracked. This can't be undone.
        </Dialog>
      )}
    </section>
  )
}
