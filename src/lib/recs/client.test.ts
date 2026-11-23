import { afterEach, describe, expect, it, vi } from 'vitest'
import { normaliseRecsUrl, RecsClient, RecsError } from './client'

afterEach(() => vi.unstubAllGlobals())

describe('normaliseRecsUrl', () => {
  it('adds https and drops trailing slashes', () => {
    expect(normaliseRecsUrl(' recs.example.com/ ')).toBe('https://recs.example.com')
    expect(normaliseRecsUrl('http://localhost:8098//')).toBe('http://localhost:8098')
    expect(normaliseRecsUrl('')).toBe('')
  })
})

describe('RecsClient', () => {
  const client = new RecsClient('recs.example.com', ' secret-key ')

  it('builds /api/v1 URLs, repeating list params and skipping empty ones', () => {
    expect(client.buildUrl('/releases/new', { scope: 'related', type: ['album', 'ep'], since: undefined, limit: 60 })).toBe(
      'https://recs.example.com/api/v1/releases/new?scope=related&type=album&type=ep&limit=60',
    )
  })

  it('sends the bearer key and parses JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ total: 0, items: [] })))
    vi.stubGlobal('fetch', fetchMock)
    await expect(client.get('/recommendations/artists')).resolves.toEqual({ total: 0, items: [] })
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ Authorization: 'Bearer secret-key' })
  })

  it('posts JSON bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    await client.post('/feedback', { mbid: 'x', kind: 'artist', action: 'like' })
    const init = fetchMock.mock.calls[0][1]
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', Authorization: 'Bearer secret-key' })
    expect(JSON.parse(init.body)).toEqual({ mbid: 'x', kind: 'artist', action: 'like' })
  })

  it('explains a rejected key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"detail":"Invalid API key"}', { status: 401 })))
    const error = await client.get('/status').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(RecsError)
    expect((error as RecsError).status).toBe(401)
    expect((error as RecsError).isClientError).toBe(true)
    expect((error as Error).message).toMatch(/API key/)
  })

  it('passes on FastAPI error details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"detail":"artist not in the graph"}', { status: 404 })))
    await expect(client.get('/artists/x')).rejects.toThrow('Coffee Recs: artist not in the graph')
  })

  it('reports network and CORS failures with status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const error = (await client.get('/status').catch((e: unknown) => e)) as RecsError
    expect(error.status).toBe(0)
    expect(error.message).toMatch(/CORS_ORIGINS/)
  })

  it('lets aborts through untouched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')))
    await expect(client.get('/status')).rejects.toHaveProperty('name', 'AbortError')
  })
})
