import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  children: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', className, children, ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], size === 'sm' ? styles.sm : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
