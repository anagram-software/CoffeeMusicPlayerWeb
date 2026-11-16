import type { Child } from 'subsonic-api'

/** The subset of a Subsonic song the player keeps (and persists) in the queue. */
export interface Track {
  id: string
  title: string
  artist?: string
  artistId?: string
  album?: string
  albumId?: string
  coverArt?: string
  duration?: number
  year?: number
  starred?: boolean
}

/** A queue entry. `qid` is unique even when the same song is queued twice. */
export interface QueueItem {
  qid: string
  track: Track
}

export type RepeatMode = 'off' | 'all' | 'one'

export function toTrack(c: Child): Track {
  return {
    id: c.id,
    title: c.title,
    artist: c.displayArtist ?? c.artist,
    artistId: c.artistId,
    album: c.album,
    albumId: c.albumId,
    coverArt: c.coverArt,
    duration: c.duration,
    year: c.year,
    starred: !!c.starred,
  }
}

let counter = 0
export function toItems(tracks: Track[]): QueueItem[] {
  return tracks.map((track) => ({ qid: `${Date.now().toString(36)}-${(counter++).toString(36)}`, track }))
}

/** Fisher–Yates; returns a new array. */
export function shuffled<T>(items: T[], random = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** `first` followed by the rest of `items` in random order. */
export function shuffleKeepingFirst(items: QueueItem[], first: QueueItem | undefined, random = Math.random): QueueItem[] {
  if (!first) return shuffled(items, random)
  return [first, ...shuffled(items.filter((i) => i.qid !== first.qid), random)]
}

/**
 * Which index plays after `index`. `auto` = the track ended by itself
 * (repeat-one only applies then; pressing "next" always moves on).
 */
export function nextIndex(index: number, length: number, repeat: RepeatMode, auto: boolean): number | null {
  if (length === 0) return null
  if (auto && repeat === 'one') return index
  if (index + 1 < length) return index + 1
  return repeat === 'off' ? null : 0
}

export function previousIndex(index: number, length: number, repeat: RepeatMode): number | null {
  if (length === 0) return null
  if (index > 0) return index - 1
  return repeat === 'off' ? null : length - 1
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const a = [...items]
  const [item] = a.splice(from, 1)
  a.splice(to, 0, item)
  return a
}
