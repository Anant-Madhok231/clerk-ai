import { useEffect, type ReactNode } from 'react'
import styles from './Dialog.module.css'

export interface DialogProps {
  title: string
  children: ReactNode
  actions: ReactNode
  onClose: () => void
}

export function Dialog({ title, children, actions, onClose }: DialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label={title}>
        <p className={styles.title}>{title}</p>
        <div className={styles.body}>{children}</div>
        <div className={styles.actions}>{actions}</div>
      </div>
    </div>
  )
}
