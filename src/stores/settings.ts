import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const streamFormats = { raw: 'Original', mp3: 'MP3', opus: 'Opus' } as const
export type StreamFormat = keyof typeof streamFormats
/** 0 = no limit. Only applies when the server transcodes. */
export const maxBitRates = [0, 320, 256, 192, 128, 96] as const

interface SettingsState {
  streamFormat: StreamFormat
  maxBitRate: (typeof maxBitRates)[number]
  /** Report plays to the server (play counts, Last.fm/ListenBrainz via Navidrome). */
  scrobble: boolean
  /** Look up lyrics the server doesn't have on lrclib.net (sends title/artist/album there). */
  lrclib: boolean
  set: (partial: Partial<Omit<SettingsState, 'set'>>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      streamFormat: 'raw',
      maxBitRate: 0,
      scrobble: true,
      lrclib: false,
      set: (partial) => set(partial),
    }),
    { name: 'coffee.settings', partialize: ({ streamFormat, maxBitRate, scrobble, lrclib }) => ({ streamFormat, maxBitRate, scrobble, lrclib }) },
  ),
)
