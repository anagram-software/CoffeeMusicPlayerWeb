import { externalProvider } from '@/lib/subsonic/external'
import { cn } from '@/lib/utils'

/** Small "Qobuz"-style tag for Octo-Fiesta items (not in your library yet). Renders nothing for library items. */
export function ProviderBadge({ id, className }: { id: string | undefined; className?: string }) {
  const provider = externalProvider(id)
  if (!provider) return null
  return (
    <span
      title={`From ${provider}: downloaded to your server when played`}
      className={cn('inline-flex shrink-0 items-center rounded-sm bg-foreground/10 px-1 py-px text-[10px] font-medium tracking-wide text-foreground/70 uppercase', className)}
    >
      {provider}
    </span>
  )
}
