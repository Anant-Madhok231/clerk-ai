import { HelpCircle } from 'lucide-react'
import styles from './StatusBadge.module.css'

/** below 0.85 confidence clerk shows it as uncertain instead of a settled fact */
export function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.85) return null
  return (
    <span className={`${styles.badge} ${styles.uncertain}`}>
      <HelpCircle className={styles.icon} strokeWidth={2.5} />
      Needs confirmation
    </span>
  )
}
