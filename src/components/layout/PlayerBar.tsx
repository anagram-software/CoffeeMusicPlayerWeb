import { MdFavoriteBorder, MdMusicNote, MdPlayArrow, MdSkipNext, MdSkipPrevious } from 'react-icons/md'
import { Button } from '@/components/ui/button'

/**
 * Mini player, modelled on the Android frag_mini_player. Static for now;
 * the playback engine is wired up in phase 3.
 */
export function PlayerBar() {
  return (
    <footer className="relative border-t border-border bg-card">
      {/* Progress line along the top edge */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-white/5">
        <div className="h-full w-0 bg-white" />
      </div>

      <div className="flex h-16 items-center gap-3 px-3 md:h-20 md:px-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded bg-art md:size-14">
          <MdMusicNote className="size-6 text-white/40" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">Nothing playing</div>
          <div className="truncate text-xs text-muted-foreground">Pick something from your library</div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-lg" disabled aria-label="Favorite" className="hidden sm:inline-flex">
            <MdFavoriteBorder className="size-5" />
          </Button>
          <Button variant="ghost" size="icon-lg" disabled aria-label="Previous" className="hidden sm:inline-flex">
            <MdSkipPrevious className="size-6" />
          </Button>
          <Button size="icon-lg" disabled aria-label="Play" className="size-10 rounded-full bg-white text-black hover:bg-white/90">
            <MdPlayArrow className="size-6" />
          </Button>
          <Button variant="ghost" size="icon-lg" disabled aria-label="Next">
            <MdSkipNext className="size-6" />
          </Button>
        </div>
      </div>
    </footer>
  )
}
