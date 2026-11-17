import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchLastfmTracks, LastfmError } from './lastfm'

const respond = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
const track = (name: string, artist: string) => ({ name, artist: { name: artist } })

afterEach(() => vi.unstubAllGlobals())

describe('fetchLastfmTracks', () => {
  it('pages through results, drops duplicates and stops at the limit', async () => {
    const fetchMock = vi.fn((url: URL) => {
      const page = url.searchParams.get('page')
      return respond({
        lovedtracks: {
          track: page === '1' ? [track('A', 'X'), track('B', 'X')] : [track('b', 'x'), track('C', 'Y'), track('D', 'Y')],
          '@attr': { totalPages: '5' },
        },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const tracks = await fetchLastfmTracks('key', { kind: 'loved', user: 'rj' }, 3)
    expect(tracks).toEqual([
      { artist: 'X', title: 'A' },
      { artist: 'X', title: 'B' },
      { artist: 'Y', title: 'C' },
    ])
    const first = fetchMock.mock.calls[0][0]
    expect(first.searchParams.get('method')).toBe('user.getLovedTracks')
    expect(first.searchParams.get('api_key')).toBe('key')
  })

  it('accepts a single track sent as an object', async () => {
    vi.stubGlobal('fetch', () => respond({ tracks: { track: track('Only', 'Z'), '@attr': { totalPages: '1' } } }))
    expect(await fetchLastfmTracks('key', { kind: 'tag', tag: 'rare' }, 50)).toEqual([{ artist: 'Z', title: 'Only' }])
  })

  it('reports an invalid key clearly', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(JSON.stringify({ error: 10, message: 'Invalid API key' }), { status: 403 })))
    const err = await fetchLastfmTracks('bad', { kind: 'loved', user: 'rj' }, 10).catch((e) => e)
    expect(err).toBeInstanceOf(LastfmError)
    expect(err.message).toMatch(/Settings/)
  })
})
