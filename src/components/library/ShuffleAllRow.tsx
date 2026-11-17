import { MdShuffle } from 'react-icons/md'
import { plural } from '@/lib/format'

/** "Shuffle all · N tracks" header, after the Android shuffle.xml. */
export function ShuffleAllRow({ count, onShuffle }: { count: number; onShuffle: () => void }) {
  return (
    <button
      type="button"
      onClick={onShuffle}
      disabled={count === 0}
      className="flex h-16 w-full items-center gap-4 rounded-md px-2 text-left transition-colors hover:bg-foreground/5 disabled:opacity-50"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-section text-section-foreground">
        <MdShuffle className="size-6" />
      </div>
      <div>
        <div className="text-sm font-medium uppercase tracking-wide">Shuffle all</div>
        <div className="text-xs text-muted-foreground">{plural(count, 'track')}</div>
      </div>
    </button>
  )
}
