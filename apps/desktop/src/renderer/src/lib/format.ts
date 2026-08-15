export function formatAmount(amount: number, currency: string | null): string {
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (currency ?? 'USD') === 'USD' ? `$${formatted}` : `${currency} ${formatted}`
}
