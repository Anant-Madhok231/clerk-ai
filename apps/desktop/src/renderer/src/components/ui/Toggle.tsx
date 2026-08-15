import styles from './Toggle.module.css'

export function Toggle({
  label,
  description,
  checked,
  onChange
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className={styles.row}>
      <div className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description ? <span className={styles.description}>{description}</span> : null}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className={`${styles.knob} ${checked ? styles.knobOn : ''}`} />
      </button>
    </div>
  )
}
