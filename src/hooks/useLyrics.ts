import { useQuery } from '@tanstack/react-query'
import type { Lyrics as PlainLyrics, LyricsList } from 'subsonic-api'
import { fetchLrclib, fromStructured, type Lyrics, parseLrc } from '@/lib/lyrics'
import type { Track } from '@/player/queue'
import { useSessionStore, useSubsonic } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'

/**
 * Lyrics for a track: the server's own (embedded tags / .lrc files via the
 * OpenSubsonic songLyrics extension, else the classic getLyrics call), then
 * optionally LRCLIB, which is also preferred when it has synced lyrics and
 * the server only plain ones. Resolves to null when none are found.
 */
export function useLyrics(track: Track | undefined) {
  const client = useSubsonic()
  const hasSongLyrics = useSessionStore((s) => s.session?.server.extensions.includes('songLyrics') ?? false)
  const lrclib = useSettingsStore((s) => s.lrclib)

  return useQuery({
    queryKey: ['lyrics', track?.id, lrclib],
    enabled: !!track,
    staleTime: Infinity,
    queryFn: async ({ signal }): Promise<Lyrics | null> => {
      const t = track!
      let lyrics: Lyrics | null = null
      if (hasSongLyrics) {
        const r = await client.get<{ lyricsList: LyricsList }>('getLyricsBySongId', { id: t.id }, { signal })
        lyrics = fromStructured(r.lyricsList)
      } else if (t.artist) {
        const r = await client.get<{ lyrics: PlainLyrics }>('getLyrics', { artist: t.artist, title: t.title }, { signal })
        const text = (r.lyrics as { value?: string } | undefined)?.value
        if (text) lyrics = { ...parseLrc(text), source: 'server' }
      }
      // Online lookup fills gaps, and upgrades plain server lyrics to synced ones when it can.
      if (lrclib && !lyrics?.synced) {
        const online = await fetchLrclib(t, signal).catch(() => null)
        if (online && (!lyrics || online.synced)) lyrics = online
      }
      return lyrics
    },
  })
}
