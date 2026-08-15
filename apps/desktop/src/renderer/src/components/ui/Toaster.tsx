import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { useToastStore } from '../../lib/toast'
import styles from './Toaster.module.css'

const TONE_ICON = { success: CheckCircle2, error: XCircle, info: Info }

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  if (toasts.length === 0) return null

  return (
    <div className={styles.stack}>
      {toasts.map((toast) => {
        const Icon = TONE_ICON[toast.tone]
        return (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
            <Icon className={styles.icon} />
            {toast.message}
          </div>
        )
      })}
    </div>
  )
}
