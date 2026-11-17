import type { IconType } from 'react-icons'
import { MdErrorOutline } from 'react-icons/md'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <MdErrorOutline className="size-10 text-destructive" />
      <p className="text-sm text-muted-foreground">{error.message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon, message }: { icon: IconType; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground">
      <Icon className="size-12 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-square rounded-md" />
      ))}
    </div>
  )
}

export function ListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex h-16 items-center gap-4 px-2">
          <Skeleton className="size-12 rounded" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Small uppercase section title within a page. */
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-xs font-medium tracking-wider text-section-ink uppercase">{children}</h2>
      {action}
    </div>
  )
}
