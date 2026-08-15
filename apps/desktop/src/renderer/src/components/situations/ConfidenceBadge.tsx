import { HelpCircle } from 'lucide-react'
import styles from './StatusBadge.module.css'

/** Confidence thresholds from PRODUCT_SPEC.md §13 — below 0.85 Clerk shows the item as uncertain rather than presenting it as settled fact. */
export function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.85) return null
  return (
    <span className={`${styles.badge} ${styles.uncertain}`}>
      <HelpCircle className={styles.icon} strokeWidth={2.5} />
      Needs confirmation
    </span>
  )
}
