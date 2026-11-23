/*
 * Client for Coffee Recs (~/Projects/coffee-recs), the MusicBrainz recommendation
 * service. REST under /api/v1 with one static bearer key; the service must list
 * this site's origin in its CORS_ORIGINS.
 */

/** One item of any recommendation or release list (the API's RecommendationItem). */
export interface RecItem {
  mbid: string
  kind: RecKind
  name: string
  score?: number | null
  /** Why it's recommended, as a path from your library: ["You have X", "X and Y are …"]. */
  reason: string[]
  /**
   * Release groups and songs: Cover Art Archive URL (when the release has art). Artists: their
   * picture, Navidrome's public share link for library artists, otherwise Apple Music's (null
   * until the service's images job has looked the artist up).
   */
  cover_url?: string | null
  /** MusicBrainz partial date: "2026", "2026-03" or "2026-03-14". */
  first_release_date?: string | null
  /** Set when the item is already in the library. */
  subsonic_id?: string | null
  musicbrainz_url: string
  artist_credit?: { mbid?: string | null; name?: string | null }[] | null
  primary_type?: string | null
  secondary_types?: string[] | null
  upcoming?: boolean | null
  /** Songs: the album it is on. */
  release_name?: string | null
  /** Songs. */
  length_ms?: number | null
}

export type RecKind = 'artist' | 'release-group' | 'recording'

export interface ItemPage {
  total: number
  items: RecItem[]
}

export type FeedbackAction = 'like' | 'dismiss'

export interface FeedbackEntry {
  mbid: string
  kind: RecKind
  action: FeedbackAction
  created_at: string
}

export interface FeedbackResult {
  mbid: string
  action: FeedbackAction | 'clear'
  /** False while a run is active; the next scoring picks the change up. */
  rescoring: boolean
}

/** The parts of GET /status the app shows. */
export interface RecsStatus {
  version: string
  running: boolean
  next_run_at: string | null
  last_run: { started_at: string; finished_at: string | null } | null
  library: { artists: number; albums: number; confirmed: number; unconfirmed: number; unmatched: number }
}

export class RecsError extends Error {
  /** HTTP status, or 0 when the request never got a response (network or CORS). */
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'RecsError'
    this.status = status
  }

  /** 4xx: retrying won't help. */
  get isClientError() {
    return this.status >= 400 && this.status < 500
  }
}

type Params = Record<string, string | number | boolean | undefined | null | string[]>

/** "mrecs.example.com/" → "https://mrecs.example.com". */
export function normaliseRecsUrl(input: string): string {
  let url = input.trim()
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  return url.replace(/\/+$/, '')
}

export class RecsClient {
  readonly url: string
  private readonly key: string

  constructor(url: string, key: string) {
    this.url = normaliseRecsUrl(url)
    this.key = key.trim()
  }

  /** Identifies the client in query keys, so changing the address or key refetches. */
  get cacheKey() {
    return `${this.url}|${this.key.slice(-6)}`
  }

  buildUrl(path: string, params: Params = {}): string {
    const search = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue
      for (const item of Array.isArray(v) ? v : [v]) search.append(k, String(item))
    }
    const qs = search.toString()
    return `${this.url}/api/v1${path}${qs ? `?${qs}` : ''}`
  }

  async get<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
    return this.request<T>(this.buildUrl(path, params), { signal })
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(this.buildUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    let res: Response
    try {
      res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${this.key}` } })
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      // Browsers report a CORS refusal exactly like a network failure.
      throw new RecsError(0, `Couldn't reach Coffee Recs at ${this.url}. Check the address, and that the service allows this site (${location.origin}) in CORS_ORIGINS.`)
    }
    if (!res.ok) throw new RecsError(res.status, await errorMessage(res))
    return (await res.json()) as T
  }
}

async function errorMessage(res: Response): Promise<string> {
  if (res.status === 401 || res.status === 403) return 'Coffee Recs rejected the API key. Check it in Settings → Recommendations.'
  let detail = ''
  try {
    const body = (await res.json()) as { detail?: unknown }
    detail = typeof body.detail === 'string' ? body.detail : ''
  } catch {
    // not JSON
  }
  return detail ? `Coffee Recs: ${detail}` : `Coffee Recs returned HTTP ${res.status}`
}
