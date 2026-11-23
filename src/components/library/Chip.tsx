import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A pill toggle for filters above a list (search sources, Discover options). */
export function Chip({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors',
        active ? 'border-transparent bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
