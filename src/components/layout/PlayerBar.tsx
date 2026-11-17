import { MdExpandLess, MdLyrics, MdQueueMusic } from 'react-icons/md'
import { CoverArt } from '@/components/CoverArt'
import { StarButton } from '@/components/StarButton'
import { togglePanel } from '@/components/player/sidePanelState'
import { NextButton, PlayPauseButton, PreviousButton, RepeatButton, SeekBar, ShuffleButton, VolumeControl } from '@/components/player/controls'
import { Button } from '@/components/ui/button'
import { useResolvedTheme } from '@/hooks/useTheme'
import { useArtColor } from '@/lib/artColor'
import { cn } from '@/lib/utils'
import { useCurrentTrack, usePlayerStore } from '@/player/store'

/**
 * Bottom player bar. On mobile it's the Android mini player (art, title,
 * play/next, progress line on top); on desktop it adds the seek bar,
 * shuffle/repeat, volume and queue. Tapping the track opens the full player.
 */
export function PlayerBar() {
  const track = useCurrentTrack()
  const theme = useResolvedTheme()
  // Dark mode: the dark art tint blended into the bar. Light mode: a pastel of the same hue.
  const tint = useArtColor(track?.coverArt, theme)
  const tintAmount = theme === 'dark' ? 55 : 90
  const progress = usePlayerStore((s) => (s.duration ? (s.currentTime / s.duration) * 100 : 0))
  const panel = usePlayerStore((s) => s.panel)
  const openFull = () => usePlayerStore.setState({ fullPlayerOpen: true })

  return (
    <footer
      className="relative border-t border-border bg-card transition-colors duration-700"
      style={tint ? { backgroundColor: `color-mix(in oklab, ${tint} ${tintAmount}%, var(--card))` } : undefined}
    >
      {/* Mobile progress line along the top edge */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-foreground/10 md:hidden">
        <div className="h-full bg-foreground" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex h-16 items-center gap-3 px-3 md:grid md:h-20 md:grid-cols-[1fr_minmax(0,36rem)_1fr] md:gap-6 md:px-5">
        {/* Track info: opens the full player */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => track && openFull()}
            disabled={!track}
            className="group flex min-w-0 items-center gap-3 text-left"
            aria-label="Open player"
          >
            <div className="relative shrink-0">
              <CoverArt id={track?.coverArt} size={112} className="size-11 rounded md:size-14" />
              {track && (
                <div className="absolute inset-0 hidden items-center justify-center rounded bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 md:flex">
                  <MdExpandLess className="size-7 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{track?.title ?? 'Nothing playing'}</div>
              <div className="truncate text-xs text-muted-foreground">
                {track ? [track.artist, track.album].filter(Boolean).join(' • ') : 'Pick something from your library'}
              </div>
            </div>
          </button>
          {track && <StarButton kind="song" id={track.id} starred={track.starred} className="hidden shrink-0 md:inline-flex" />}
        </div>

        {/* Desktop centre: transport + seek */}
        <div className="hidden flex-col items-center gap-1 md:flex">
          <div className="flex items-center gap-2">
            <ShuffleButton />
            <PreviousButton />
            <PlayPauseButton size="sm" />
            <NextButton />
            <RepeatButton />
          </div>
          <SeekBar compact className="w-full" />
        </div>

        {/* Mobile: play + next. Larger screens: volume + lyrics/queue panel toggles (on mobile those live in the full player). */}
        <div className="flex shrink-0 items-center justify-end gap-0.5 md:gap-1">
          <PlayPauseButton size="sm" className="md:hidden" />
          <NextButton className="md:hidden" />
          <VolumeControl className="mr-1 hidden lg:flex" />
          <PanelButton label="Lyrics" icon={MdLyrics} active={panel === 'lyrics'} onClick={() => togglePanel('lyrics')} />
          <PanelButton label="Queue" icon={MdQueueMusic} active={panel === 'queue'} onClick={() => togglePanel('queue')} />
        </div>
      </div>
    </footer>
  )
}

function PanelButton({ label, icon: Icon, active, onClick }: { label: string; icon: typeof MdLyrics; active: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn('hidden md:inline-flex', active ? 'text-section-ink' : 'text-muted-foreground hover:text-foreground')}
    >
      <Icon className="size-5" />
    </Button>
  )
}
