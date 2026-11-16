import type { LyricsList, StructuredLyrics } from 'subsonic-api'

export interface LyricLine {
  /** Milliseconds from the start of the track (synced lyrics only). */
  start?: number
  text: string
}

export interface Lyrics {
  synced: boolean
  lines: LyricLine[]
  source: 'server' | 'lrclib'
}

/**
 * Parses LRC: "[mm:ss.xx]text", possibly several timestamps per line, plus
 * an optional "[offset:±ms]" tag (positive = show sooner). Unsynced text
 * (no timestamps) comes back with synced=false.
 */
export function parseLrc(lrc: string): Omit<Lyrics, 'source'> {
  let offset = 0
  const timed: LyricLine[] = []
  const plain: LyricLine[] = []
  for (const raw of lrc.split(/\r?\n/)) {
    const offsetTag = raw.match(/^\[offset:\s*([+-]?\d+)\]/i)
    if (offsetTag) {
      offset = Number(offsetTag[1])
      continue
    }
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)]
    const text = raw.replace(/\[[^\]]*\]/g, '').trim()
    if (stamps.length === 0) {
      // Skip metadata tags like [ar:Artist]
      if (!/^\[[a-z]+:.*\]$/i.test(raw.trim())) plain.push({ text: raw.trim() })
      continue
    }
    for (const [, m, s] of stamps) {
      timed.push({ start: Math.round((Number(m) * 60 + Number(s.replace(':', '.'))) * 1000), text })
    }
  }
  if (timed.length === 0) return { synced: false, lines: trimBlank(plain) }
  timed.sort((a, b) => a.start! - b.start!)
  return { synced: true, lines: timed.map((l) => ({ ...l, start: Math.max(0, l.start! - offset) })) }
}

function trimBlank(lines: LyricLine[]) {
  let a = 0
  let b = lines.length
  while (a < b && !lines[a].text) a++
  while (b > a && !lines[b - 1].text) b--
  return lines.slice(a, b)
}

/** Picks the best OpenSubsonic structured lyrics: main vocals, synced if available. */
export function fromStructured(list: LyricsList | undefined): Lyrics | null {
  const all = (list?.structuredLyrics ?? []).filter((l) => l.line?.length)
  if (all.length === 0) return null
  const main = all.filter((l) => !(l as StructuredLyrics & { kind?: string }).kind || (l as { kind?: string }).kind === 'main')
  const pool = main.length ? main : all
  const best = pool.find((l) => l.synced) ?? pool[0]
  const offset = best.offset ?? 0
  return {
    synced: !!best.synced,
    source: 'server',
    lines: best.line!.map((l) => ({
      text: l.value,
      start: best.synced && l.start !== undefined ? Math.max(0, l.start - offset) : undefined,
    })),
  }
}

/** Index of the line being sung at `timeMs`, or -1 before the first line. */
export function activeLineIndex(lines: LyricLine[], timeMs: number): number {
  let lo = 0
  let hi = lines.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if ((lines[mid].start ?? 0) <= timeMs) {
      found = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return found
}

/** Lines like "[Chorus]" or "Verse 2:" are section headers, shown in the accent colour (as in the Android app). */
export function isSectionHeader(text: string): boolean {
  return /^\[.+\]$/.test(text) || /^(verse|chorus|pre-chorus|bridge|intro|outro|hook)\b.*:?$/i.test(text)
}

/** LRCLIB (lrclib.net): free, CORS-enabled lyrics database. Returns null when not found. */
export async function fetchLrclib(
  track: { title: string; artist?: string; album?: string; duration?: number },
  signal?: AbortSignal,
): Promise<Lyrics | null> {
  if (!track.artist) return null
  const params = new URLSearchParams({ track_name: track.title, artist_name: track.artist })
  if (track.album) params.set('album_name', track.album)
  if (track.duration) params.set('duration', String(Math.round(track.duration)))
  const res = await fetch(`https://lrclib.net/api/get?${params}`, { signal })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`LRCLIB responded with HTTP ${res.status}`)
  const data = (await res.json()) as { syncedLyrics?: string | null; plainLyrics?: string | null; instrumental?: boolean }
  const text = data.syncedLyrics || data.plainLyrics
  if (!text) return null
  return { ...parseLrc(text), source: 'lrclib' }
}
