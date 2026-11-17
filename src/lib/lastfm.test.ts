import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPlaylistTracks, LastfmError, parsePlaylistUrl } from './lastfm'

const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }))
const track = (name: string, ...artists: string[]) => ({ name, artists: artists.map((a) => ({ name: a })) })

afterEach(() => vi.unstubAllGlobals())

describe('parsePlaylistUrl', () => {
  it.each([
    'https://www.last.fm/user/thatudeshuk/playlists/14630498',
    'https://last.fm/user/thatudeshuk/playlists/14630498/',
    'www.last.fm/de/user/thatudeshuk/playlists/14630498',
    'https://www.last.fm/pt-br/user/thatudeshuk/playlists/14630498?ref=share',
    '  last.fm/user/thatudeshuk/playlists/14630498  ',
  ])('reads %s', (url) => expect(parsePlaylistUrl(url)).toEqual({ user: 'thatudeshuk', id: '14630498' }))

  it.each(['https://www.last.fm/user/thatudeshuk', 'https://www.last.fm/music/Radiohead', 'https://example.com/user/x/playlists/1', 'hello'])(
    'rejects %s',
    (url) => expect(parsePlaylistUrl(url)).toBeUndefined(),
  )
})

describe('fetchPlaylistTracks', () => {
  it('reads pages through the proxy until an empty one', async () => {
    const fetchMock = vi.fn((url: string) => {
      const page = new URL(url, 'http://app').searchParams.get('page')
      if (page === '1') return json({ playlist: [track('Roses (feat. ROZES)', 'The Chainsmokers'), track('Get Lucky', 'Daft Punk', 'Pharrell Williams')] })
      if (page === '2') return json({ playlist: [track('High', 'The Chainsmokers'), { name: 'No artist' }] })
      return json({ playlist: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    expect(await fetchPlaylistTracks({ user: 'rj', id: '42' })).toEqual([
      { artist: 'The Chainsmokers', title: 'Roses (feat. ROZES)' },
      { artist: 'Daft Punk, Pharrell Williams', title: 'Get Lucky' },
      { artist: 'The Chainsmokers', title: 'High' },
    ])
    expect(fetchMock.mock.calls[0][0]).toBe('/lastfm/station/rj/playlists/42?ajax=1&page=1')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('explains a missing or private playlist', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('<html>', { status: 500, headers: { 'content-type': 'text/html' } })))
    await expect(fetchPlaylistTracks({ user: 'rj', id: '1' })).rejects.toThrow(/public/)
  })

  it('explains a missing proxy (SPA fallback serves HTML)', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })))
    const err = await fetchPlaylistTracks({ user: 'rj', id: '1' }).catch((e) => e)
    expect(err).toBeInstanceOf(LastfmError)
    expect(err.message).toMatch(/proxy/)
  })
})
