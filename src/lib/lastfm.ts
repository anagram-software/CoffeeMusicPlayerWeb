/*
 * Minimal Last.fm API client for importing track lists. The API allows
 * cross-origin requests and only needs an API key (no user login) for public
 * data. It has no playlist method (Last.fm dropped playlist.* from the API), so
 * the import offers the lists it does have: a user's loved and top tracks, and
 * the top tracks of a tag or artist.
 */

const API_URL = 'https://ws.audioscrobbler.com/2.0/'
/** Page size for paginated calls (the API's maximum varies by method; 200 works for all of these). */
const PAGE_SIZE = 200

export const lastfmPeriods = {
  overall: 'All time',
  '7day': 'Last 7 days',
  '1month': 'Last month',
  '3month': 'Last 3 months',
  '6month': 'Last 6 months',
  '12month': 'Last year',
} as const
export type LastfmPeriod = keyof typeof lastfmPeriods

export type LastfmSource =
  | { kind: 'loved'; user: string }
  | { kind: 'top'; user: string; period: LastfmPeriod }
  | { kind: 'tag'; tag: string }
  | { kind: 'artist'; artist: string }

export interface LastfmTrack {
  artist: string
  title: string
}

export class LastfmError extends Error {
  readonly code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'LastfmError'
    this.code = code
  }
}

/** Default playlist name for a source, e.g. "rj's loved tracks". */
export function describeSource(source: LastfmSource): string {
  switch (source.kind) {
    case 'loved':
      return `${source.user}'s loved tracks`
    case 'top':
      return source.period === 'overall' ? `${source.user}'s top tracks` : `${source.user}'s top tracks (${lastfmPeriods[source.period].toLowerCase()})`
    case 'tag':
      return `Top ${source.tag} tracks`
    case 'artist':
      return `${source.artist}: top tracks`
  }
}

/** Method, parameters and the response's root key for each source. */
function request(source: LastfmSource): { method: string; params: Record<string, string>; root: string } {
  switch (source.kind) {
    case 'loved':
      return { method: 'user.getLovedTracks', params: { user: source.user }, root: 'lovedtracks' }
    case 'top':
      return { method: 'user.getTopTracks', params: { user: source.user, period: source.period }, root: 'toptracks' }
    case 'tag':
      return { method: 'tag.getTopTracks', params: { tag: source.tag }, root: 'tracks' }
    case 'artist':
      return { method: 'artist.getTopTracks', params: { artist: source.artist, autocorrect: '1' }, root: 'toptracks' }
  }
}

interface RawTrack {
  name?: string
  artist?: { name?: string; '#text'?: string } | string
}

interface RawList {
  track?: RawTrack | RawTrack[]
  '@attr'?: { totalPages?: string }
}

async function call(apiKey: string, method: string, params: Record<string, string>, signal?: AbortSignal) {
  const url = new URL(API_URL)
  url.search = new URLSearchParams({ ...params, method, api_key: apiKey, format: 'json' }).toString()
  let res: Response
  try {
    res = await fetch(url, { signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new LastfmError(0, 'Could not reach Last.fm.')
  }
  const json = (await res.json().catch(() => null)) as ({ error?: number; message?: string } & Record<string, unknown>) | null
  if (json?.error) {
    const invalidKey = json.error === 10 || json.error === 26
    throw new LastfmError(json.error, invalidKey ? 'Last.fm rejected the API key. Check it in Settings.' : (json.message ?? 'Last.fm request failed'))
  }
  if (!res.ok || !json) throw new LastfmError(res.status, `Last.fm responded with HTTP ${res.status}`)
  return json
}

function toTrack(raw: RawTrack): LastfmTrack | undefined {
  const artist = typeof raw.artist === 'string' ? raw.artist : (raw.artist?.name ?? raw.artist?.['#text'])
  const title = raw.name?.trim()
  return artist?.trim() && title ? { artist: artist.trim(), title } : undefined
}

/** Fetches up to `limit` tracks from a source, in Last.fm's order, without duplicates. */
export async function fetchLastfmTracks(apiKey: string, source: LastfmSource, limit: number, signal?: AbortSignal): Promise<LastfmTrack[]> {
  const { method, params, root } = request(source)
  const tracks: LastfmTrack[] = []
  const seen = new Set<string>()
  const pageSize = Math.min(limit, PAGE_SIZE)

  for (let page = 1; tracks.length < limit; page++) {
    const json = await call(apiKey, method, { ...params, limit: String(pageSize), page: String(page) }, signal)
    const list = json[root] as RawList | undefined
    // A single result comes back as an object rather than an array.
    const raw = list?.track ? ([] as RawTrack[]).concat(list.track) : []
    for (const t of raw) {
      const track = toTrack(t)
      const key = track && `${track.artist}\u0000${track.title}`.toLowerCase()
      if (!track || !key || seen.has(key)) continue
      seen.add(key)
      tracks.push(track)
    }
    const totalPages = Number(list?.['@attr']?.totalPages ?? 1)
    if (raw.length === 0 || page >= totalPages) break
  }
  return tracks.slice(0, limit)
}

/** Throws a LastfmError if Last.fm rejects the key (one cheap request). */
export async function checkLastfmKey(apiKey: string, signal?: AbortSignal): Promise<void> {
  await call(apiKey, 'chart.getTopArtists', { limit: '1' }, signal)
}
