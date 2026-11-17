import type { Child } from 'subsonic-api'
import { isExternalId } from './external'
import { looksLikeCover } from './relevance'

/*
 * Matching tracks from another service (Last.fm) against search3 results:
 * library songs and, through Octo-Fiesta, streaming-provider songs.
 */

/** Lowercase, no accents or punctuation, "&" → "and", single spaces. */
export function normalise(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

// Qualifiers that don't make a different recording. Live versions, remixes and
// acoustic takes do, so they're kept.
const NOISE = /\b(remaster(ed)?|feat\.?|ft\.?|featuring|with|explicit|clean|mono|stereo|single version|album version|radio edit|deluxe|bonus track)\b/i

/**
 * "Song (Remastered 2011)" / "Song - 2011 Remaster" / "Song [feat. X]" → "song".
 * For comparing titles across services that label editions differently.
 */
export function coreTitle(title: string): string {
  const stripped = title
    .replace(/\s*[([][^)\]]*[)\]]/g, (part) => (NOISE.test(part) ? '' : part))
    .replace(/\s+-\s+.*$/, (part) => (NOISE.test(part) ? '' : part))
    .replace(/\s+(feat\.?|ft\.?|featuring)\s.*$/i, '')
  return normalise(stripped)
}

/** Title without any bracketed parts, for search queries ("Song (Live at X)" → "Song"). */
export function searchTitle(title: string): string {
  return title.replace(/\s*[([][^)\]]*[)\]]/g, '').replace(/\s+-\s+.*$/, '').trim() || title
}

function artistNames(song: Child): string[] {
  const extra = (song as { artists?: { name: string }[]; displayArtist?: string }).artists?.map((a) => a.name) ?? []
  return [song.artist, (song as { displayArtist?: string }).displayArtist, ...extra].filter((n): n is string => !!n)
}

/** Same artist, allowing for featured artists and "The" ("Beatles" vs "The Beatles, Billy Preston"). */
export function artistMatches(wanted: string, candidate: string): boolean {
  const strip = (s: string) => normalise(s).replace(/^the /, '')
  const a = strip(wanted)
  const b = strip(candidate)
  if (!a || !b) return false
  if (a === b) return true
  // One is the other plus more artists ("daft punk" / "daft punk feat pharrell williams"),
  // on a word boundary so "hole" doesn't match "holes".
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  return longer.startsWith(`${shorter} `)
}

/** 2 = exact title, 1 = same title once edition labels are removed, 0 = not this song. */
export function matchScore(wanted: { artist: string; title: string }, song: Child): number {
  if (!song.title || !artistNames(song).some((n) => artistMatches(wanted.artist, n))) return 0
  if (looksLikeCover(song.title, song.album, song.artist) && !looksLikeCover(wanted.title, wanted.artist)) return 0
  if (normalise(song.title) === normalise(wanted.title)) return 2
  return coreTitle(song.title) === coreTitle(wanted.title) ? 1 : 0
}

/**
 * The best candidate for a track: a library song if there is one (no download
 * needed), otherwise a streaming-provider song. Ties keep the server's order.
 */
export function pickMatch(wanted: { artist: string; title: string }, candidates: Child[]): Child | undefined {
  let best: { song: Child; rank: number } | undefined
  for (const song of candidates) {
    const score = matchScore(wanted, song)
    if (!score) continue
    const rank = score + (isExternalId(song.id) ? 0 : 10)
    if (!best || rank > best.rank) best = { song, rank }
  }
  return best?.song
}
