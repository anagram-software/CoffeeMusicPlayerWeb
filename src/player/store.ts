import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { moveItem, type QueueItem, type RepeatMode, shuffleKeepingFirst, type Track, toItems } from './queue'

/*
 * Player state. This store has no side effects: the engine (engine.ts)
 * watches it and drives the <audio> elements, and UI calls `player.*`
 * from engine.ts rather than these setters directly.
 */

interface PlayerState {
  queue: QueueItem[]
  /** The queue in its original order while shuffle is on, so turning it off restores it. */
  unshuffled: QueueItem[] | null
  /** Index of the current item in `queue`, or -1 when empty. */
  index: number
  shuffle: boolean
  repeat: RepeatMode
  volume: number
  muted: boolean
  /** Last known position of the current track, to resume after a reload. */
  savedPosition: number

  // Runtime only (not persisted)
  playing: boolean
  buffering: boolean
  currentTime: number
  duration: number
  fullPlayerOpen: boolean
  queueOpen: boolean
}

interface PlayerActions {
  _setQueue: (tracks: Track[], startIndex: number, shuffle?: boolean) => void
  _insertNext: (tracks: Track[]) => void
  _append: (tracks: Track[]) => void
  /** Returns true if the removed item was the current one. */
  _remove: (qid: string) => boolean
  _move: (from: number, to: number) => void
  _setIndex: (index: number) => void
  _toggleShuffle: () => void
  _clear: () => void
  set: (partial: Partial<PlayerState>) => void
}

export const usePlayerStore = create<PlayerState & PlayerActions>()(
  persist(
    (set, get) => ({
      queue: [],
      unshuffled: null,
      index: -1,
      shuffle: false,
      repeat: 'off',
      volume: 1,
      muted: false,
      savedPosition: 0,
      playing: false,
      buffering: false,
      currentTime: 0,
      duration: 0,
      fullPlayerOpen: false,
      queueOpen: false,

      set: (partial) => set(partial),

      _setQueue: (tracks, startIndex, shuffle = get().shuffle) => {
        const items = toItems(tracks)
        if (shuffle) {
          set({ queue: shuffleKeepingFirst(items, items[startIndex]), unshuffled: items, index: 0, shuffle: true })
        } else {
          set({ queue: items, unshuffled: null, index: startIndex, shuffle: false })
        }
        set({ savedPosition: 0, currentTime: 0 })
      },

      _insertNext: (tracks) => {
        const { queue, index, unshuffled } = get()
        const items = toItems(tracks)
        const at = index + 1
        const next: Partial<PlayerState> = { queue: [...queue.slice(0, at), ...items, ...queue.slice(at)] }
        if (unshuffled) {
          const cur = queue[index]
          const pos = cur ? unshuffled.findIndex((i) => i.qid === cur.qid) + 1 : unshuffled.length
          next.unshuffled = [...unshuffled.slice(0, pos), ...items, ...unshuffled.slice(pos)]
        }
        if (index === -1) next.index = 0
        set(next)
      },

      _append: (tracks) => {
        const { queue, index, unshuffled } = get()
        const items = toItems(tracks)
        set({
          queue: [...queue, ...items],
          unshuffled: unshuffled ? [...unshuffled, ...items] : null,
          index: index === -1 ? 0 : index,
        })
      },

      _remove: (qid) => {
        const { queue, index, unshuffled } = get()
        const at = queue.findIndex((i) => i.qid === qid)
        if (at === -1) return false
        const newQueue = queue.filter((i) => i.qid !== qid)
        let newIndex = index
        if (at < index) newIndex = index - 1
        // Removing the current item: the next one slides into its place.
        if (newIndex >= newQueue.length) newIndex = newQueue.length - 1
        set({ queue: newQueue, unshuffled: unshuffled?.filter((i) => i.qid !== qid) ?? null, index: newIndex })
        return at === index
      },

      _move: (from, to) => {
        const { queue, index } = get()
        const current = queue[index]
        const newQueue = moveItem(queue, from, to)
        set({ queue: newQueue, index: current ? newQueue.findIndex((i) => i.qid === current.qid) : -1 })
      },

      _setIndex: (index) => set({ index, savedPosition: 0, currentTime: 0 }),

      _toggleShuffle: () => {
        const { shuffle, queue, index, unshuffled } = get()
        const current = queue[index]
        if (!shuffle) {
          set({ shuffle: true, unshuffled: queue, queue: shuffleKeepingFirst(queue, current), index: current ? 0 : -1 })
        } else {
          const restored = unshuffled ?? queue
          set({
            shuffle: false,
            unshuffled: null,
            queue: restored,
            index: current ? restored.findIndex((i) => i.qid === current.qid) : -1,
          })
        }
      },

      _clear: () => set({ queue: [], unshuffled: null, index: -1, savedPosition: 0, currentTime: 0, duration: 0, playing: false }),
    }),
    {
      name: 'coffee.player',
      partialize: (s) => ({
        queue: s.queue,
        unshuffled: s.unshuffled,
        index: s.index,
        shuffle: s.shuffle,
        repeat: s.repeat,
        volume: s.volume,
        muted: s.muted,
        savedPosition: s.savedPosition,
      }),
    },
  ),
)

export function useCurrentTrack(): Track | undefined {
  return usePlayerStore((s) => s.queue[s.index]?.track)
}
