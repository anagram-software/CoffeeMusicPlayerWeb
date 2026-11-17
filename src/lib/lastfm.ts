/*
 * Reads public Last.fm playlists. The Last.fm API has no playlist method, and
 * the playlist web pages sit behind a bot check, but the site's own web player
 * loads a playlist's tracks as JSON from
 *   /player/station/user/<user>/playlists/<id>?ajax=1&page=<n>   (50 tracks a page)
 * That endpoint sends no CORS headers, so the app calls it through a same-origin
 * proxy at /lastfm/station/… (docker/nginx.conf in production, vite.config.ts in
 * development). It's undocumented and may change without notice.
 */

/** Same-origin proxy path standing in for https://www.last.fm/player/station/user/ */
const PROXY_PATH = '/lastfm/station'
/** Safety stop: 50 tracks a page, so 2,000 tracks. */
const MAX_PAGES = 40

export interface LastfmPlaylistRef {
  user: string
  id: string
}

export interface LastfmTrack {
  artist: string
  title: string
}

export class LastfmError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LastfmError'
  }
}

/**
 * "https://www.last.fm/user/rj/playlists/123" → { user: "rj", id: "123" }.
 * Also accepts localised links (last.fm/de/user/…), no scheme, and trailing
 * slashes or query strings. Undefined if it isn't a playlist link.
 */
export function parsePlaylistUrl(input: string): LastfmPlaylistRef | undefined {
  const m = input.trim().match(/^(?:https?:\/\/)?(?:www\.)?last\.fm\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?user\/([A-Za-z0-9_-]+)\/playlists\/(\d+)\/?(?:[?#].*)?$/i)
  return m ? { user: m[1], id: m[2] } : undefined
}

interface RawTrack {
  name?: string
  artists?: { name?: string }[]
}

function toTrack(raw: RawTrack): LastfmTrack | undefined {
  const title = raw.name?.trim()
  const artist = (raw.artists ?? [])
    .map((a) => a.name?.trim())
    .filter(Boolean)
    .join(', ')
  return title && artist ? { artist, title } : undefined
}

async function fetchPage(ref: LastfmPlaylistRef, page: number, signal?: AbortSignal): Promise<RawTrack[]> {
  const url = `${PROXY_PATH}/${encodeURIComponent(ref.user)}/playlists/${ref.id}?ajax=1&page=${page}`
  let res: Response
  try {
    res = await fetch(url, { signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new LastfmError('Could not reach Last.fm.')
  }
  // Last.fm answers an unknown or private playlist with an HTML error page (HTTP 500).
  if (!res.ok) throw new LastfmError("Couldn't load that playlist. Check the link and that the playlist is public.")
  // Without the proxy, the SPA fallback serves index.html here instead.
  if (!res.headers.get('content-type')?.includes('json')) throw new LastfmError("Last.fm import isn't available on this server (the /lastfm proxy is missing).")
  const json = (await res.json().catch(() => null)) as { playlist?: RawTrack[] } | null
  if (!json || !Array.isArray(json.playlist)) throw new LastfmError('Last.fm sent something unexpected for that playlist.')
  return json.playlist
}

/** All tracks of a public playlist, in order. */
export async function fetchPlaylistTracks(ref: LastfmPlaylistRef, signal?: AbortSignal): Promise<LastfmTrack[]> {
  const tracks: LastfmTrack[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const raw = await fetchPage(ref, page, signal)
    if (raw.length === 0) break
    for (const t of raw) {
      const track = toTrack(t)
      if (track) tracks.push(track)
    }
  }
  return tracks
}
