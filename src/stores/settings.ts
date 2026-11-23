import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Follow the device's light/dark preference, or force one. */
export const themes = { system: 'System', light: 'Light', dark: 'Dark' } as const
export type Theme = keyof typeof themes

export const streamFormats = { raw: 'Original', mp3: 'MP3', opus: 'Opus' } as const
export type StreamFormat = keyof typeof streamFormats
/** 0 = no limit. Only applies when the server transcodes. */
export const maxBitRates = [0, 320, 256, 192, 128, 96] as const

interface SettingsState {
  theme: Theme
  /** Show the file format/quality line under the artwork in the full player. */
  showQuality: boolean
  /** Search: which results to show (library, streaming provider, or both). */
  searchSource: 'all' | 'library' | 'external'
  /** Hide karaoke/tribute/cover filler from streaming-provider results. */
  hideCovers: boolean
  streamFormat: StreamFormat
  maxBitRate: (typeof maxBitRates)[number]
  /** Report plays to the server (play counts, Last.fm/ListenBrainz via Navidrome). */
  scrobble: boolean
  /** Look up lyrics the server doesn't have on lrclib.net (sends title/artist/album there). */
  lrclib: boolean
  /** Coffee Recs (recommendation service) base URL. The Discover page asks for setup until this and the key are set. */
  recsUrl: string
  /** Coffee Recs bearer key (its API_KEY). */
  recsKey: string
  set: (partial: Partial<Omit<SettingsState, 'set'>>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      showQuality: true,
      searchSource: 'all',
      hideCovers: true,
      streamFormat: 'raw',
      maxBitRate: 0,
      scrobble: true,
      lrclib: false,
      recsUrl: 'https://mrecs.udesh.xyz',
      recsKey: '',
      set: (partial) => set(partial),
    }),
    { name: 'coffee.settings', partialize: ({ theme, showQuality, searchSource, hideCovers, streamFormat, maxBitRate, scrobble, lrclib, recsUrl, recsKey }) => ({
        theme,
        showQuality,
        searchSource,
        hideCovers,
        streamFormat,
        maxBitRate,
        scrobble,
        lrclib,
        recsUrl,
        recsKey,
      }) },
  ),
)
