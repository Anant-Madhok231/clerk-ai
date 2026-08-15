import { Loader2 } from 'lucide-react'

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="clerk-spin" strokeWidth={2.5} />
}
