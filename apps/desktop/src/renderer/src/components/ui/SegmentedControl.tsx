import styles from './SegmentedControl.module.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className={styles.group} role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={value === option.value}
          className={`${styles.option} ${value === option.value ? styles.optionActive : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
