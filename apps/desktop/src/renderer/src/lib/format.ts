export function formatAmount(amount: number, currency: string | null): string {
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (currency ?? 'USD') === 'USD' ? `$${formatted}` : `${currency} ${formatted}`
}

/**
 * "3 days left" / "Due today" / "Overdue by 2 days" instead of a bare date.
 * Day-level only — `deadline` is stored as a date (YYYY-MM-DD) with no
 * time-of-day, so an hour-level countdown would be manufacturing precision
 * the data doesn't actually have.
 */
export function formatDeadlineCountdown(deadline: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${deadline}T00:00:00`)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays > 1) return `${diffDays} days left`
  if (diffDays === -1) return 'Overdue by 1 day'
  return `Overdue by ${Math.abs(diffDays)} days`
}
