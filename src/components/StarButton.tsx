import { MdFavorite, MdFavoriteBorder } from 'react-icons/md'
import { Button } from '@/components/ui/button'
import { type StarKind, useIsStarred, useToggleStar } from '@/lib/subsonic/stars'
import { cn } from '@/lib/utils'

interface StarButtonProps {
  kind: StarKind
  id: string
  /** The server's `starred` field. */
  starred: unknown
  className?: string
  size?: 'icon' | 'icon-lg'
}

/** Heart toggle in the Favorites pink (#FF4081), like the Android player's heart. */
export function StarButton({ kind, id, starred, className, size = 'icon-lg' }: StarButtonProps) {
  const isStarred = useIsStarred(id, starred)
  const toggle = useToggleStar()
  const Icon = isStarred ? MdFavorite : MdFavoriteBorder
  return (
    <Button
      data-section="favorites"
      variant="ghost"
      size={size}
      onClick={(e) => {
        e.stopPropagation()
        toggle(kind, id, !isStarred)
      }}
      aria-label={isStarred ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={isStarred}
      className={cn(isStarred ? 'text-section-ink hover:text-section-ink' : 'text-foreground/60 hover:text-foreground', className)}
    >
      <Icon className="size-5" />
    </Button>
  )
}
