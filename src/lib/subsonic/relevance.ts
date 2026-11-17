/*
 * Heuristics for streaming-provider (Octo-Fiesta / Qobuz) results, which carry
 * no popularity data: hide the filler that pads searches for well-known music
 * (karaoke, tributes, "made famous by" covers, lullaby/8-bit renditions…),
 * merge duplicate editions, and group an artist's releases by kind.
 */

const COVER_PATTERNS = [
  /\bkaraoke\b/,
  /\btribute\b/,
  /\bmade famous\b/,
  /\bin the style of\b/,
  /\boriginally (performed|recorded|by)\b/,
  /\blullab(y|ies)\b/,
  /\brockabye baby\b/,
  /\bvitamin string quartet\b/,
  /\bbacking track\b/,
  /\b8[- ]?bit\b/,
  /\bsing[- ]?along\b/,
  /\bcover version\b/,
  /\binstrumental version\b/,
  /\bworkout\b/,
  /\bkidz? bop\b/,
]

/** True if any of the texts (title, album, artist) look like a cover/karaoke/tribute release. */
export function looksLikeCover(...texts: (string | undefined)[]): boolean {
  const text = texts.filter(Boolean).join(' • ').toLowerCase()
  return COVER_PATTERNS.some((p) => p.test(text))
}

/** "Thriller (Deluxe Edition) [Remastered]" → "thriller": for spotting editions of the same album. */
export function baseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[([][^)\]]*(deluxe|remaster|edition|explicit|expanded|anniversary|bonus|version|clean|mono|stereo|hi-?res)[^)\]]*[)\]]/g, '')
    .replace(/\s+-\s+(deluxe|remaster|edition|explicit).*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** One entry per base title (case-insensitive), keeping the edition with the most tracks. */
export function mergeEditions<T extends { name: string; songCount?: number }>(albums: T[]): T[] {
  const best = new Map<string, T>()
  for (const a of albums) {
    const key = baseTitle(a.name)
    const current = best.get(key)
    if (!current || (a.songCount ?? 0) > (current.songCount ?? 0)) best.set(key, a)
  }
  // Keep the original order of the surviving entries.
  const keep = new Set(best.values())
  return albums.filter((a) => keep.has(a))
}

export type ReleaseKind = 'album' | 'single' | 'appearsOn'

/** Album (7+ tracks), single/EP (≤6), or "appears on" (another artist's release, e.g. a compilation). */
export function releaseKind(album: { artist?: string; displayArtist?: string; songCount?: number }, artistName: string): ReleaseKind {
  const by = (album.displayArtist ?? album.artist ?? '').toLowerCase()
  if (by && !by.includes(artistName.toLowerCase())) return 'appearsOn'
  return (album.songCount ?? 0) > 0 && (album.songCount ?? 0) <= 6 ? 'single' : 'album'
}
