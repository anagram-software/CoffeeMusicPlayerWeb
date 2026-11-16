import { md5 } from '@noble/hashes/legacy.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'
import type { SubsonicBaseResponse, SubsonicError as SubsonicErrorBody } from 'subsonic-api'

/** Identifies this app to the server (shown in Navidrome's "Players" list). */
export const CLIENT_NAME = 'CoffeeWeb'
export const API_VERSION = '1.16.1'

/**
 * What we persist after login. We never store the raw password: only a
 * salt and md5(password + salt), as described in the Subsonic API's
 * token authentication.
 */
export interface Credentials {
  /** Normalised server base URL, without a trailing slash, e.g. https://music.example.com */
  url: string
  username: string
  salt: string
  token: string
}

export class SubsonicError extends Error {
  readonly code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'SubsonicError'
    this.code = code
  }

  /** Error codes 40/41/44 mean wrong credentials or an unsupported auth method. */
  get isAuthError() {
    return this.code === 40 || this.code === 41 || this.code === 44
  }
}

type Params = Record<string, string | number | boolean | undefined | null | Array<string | number>>

export function normaliseServerUrl(input: string): string {
  let url = input.trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  return url.replace(/\/+$/, '').replace(/\/rest$/, '')
}

export function createCredentials(url: string, username: string, password: string): Credentials {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(8)))
  const token = bytesToHex(md5(utf8ToBytes(password + salt)))
  return { url: normaliseServerUrl(url), username, salt, token }
}

/**
 * Thin Subsonic client. We use `subsonic-api` only for its response types:
 * the library needs the raw password and doesn't throw on `status: "failed"`.
 */
export class SubsonicClient {
  readonly credentials: Credentials

  constructor(credentials: Credentials) {
    this.credentials = credentials
  }

  /**
   * Builds an authenticated URL. Use this for <img src> / <audio src>
   * (getCoverArt, stream). Treat the result as sensitive.
   */
  url(method: string, params: Params = {}): string {
    const { url, username, salt, token } = this.credentials
    const u = new URL(`${url}/rest/${method}`)
    const sp = u.searchParams
    sp.set('u', username)
    sp.set('t', token)
    sp.set('s', salt)
    sp.set('v', API_VERSION)
    sp.set('c', CLIENT_NAME)
    sp.set('f', 'json')
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue
      if (Array.isArray(value)) value.forEach((v) => sp.append(key, String(v)))
      else sp.set(key, String(value))
    }
    return u.toString()
  }

  /** Calls a JSON endpoint and returns the `subsonic-response` body, throwing on failure. */
  async get<T extends object = object>(
    method: string,
    params?: Params,
    init?: { signal?: AbortSignal },
  ): Promise<T & SubsonicBaseResponse> {
    let res: Response
    try {
      res = await fetch(this.url(method, params), { signal: init?.signal })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e
      // fetch() rejects with an opaque TypeError for network failures *and* CORS blocks.
      throw new SubsonicError(0, 'Could not reach the server. Check the URL and that it allows this origin (CORS).')
    }
    if (!res.ok) throw new SubsonicError(res.status, `Server responded with HTTP ${res.status}`)

    const json = (await res.json().catch(() => null)) as { 'subsonic-response'?: T & SubsonicBaseResponse } | null
    const body = json?.['subsonic-response']
    if (!body) throw new SubsonicError(0, 'This does not look like a Subsonic server.')
    if (body.status === 'failed') {
      const err = (body as { error?: SubsonicErrorBody }).error
      throw new SubsonicError(err?.code ?? 0, err?.message ?? 'Request failed')
    }
    return body
  }

  coverArtUrl(id: string | undefined, size?: number): string | undefined {
    return id ? this.url('getCoverArt', { id, size }) : undefined
  }
}
