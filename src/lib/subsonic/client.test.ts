import { md5 } from '@noble/hashes/legacy.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCredentials, normaliseServerUrl, SubsonicClient, SubsonicError } from './client'

describe('normaliseServerUrl', () => {
  it.each([
    ['music.example.com', 'https://music.example.com'],
    ['http://192.168.1.5:4533/', 'http://192.168.1.5:4533'],
    ['https://example.com/navidrome/rest/', 'https://example.com/navidrome'],
    ['  https://example.com  ', 'https://example.com'],
  ])('%s → %s', (input, expected) => expect(normaliseServerUrl(input)).toBe(expected))
})

describe('createCredentials', () => {
  it('stores md5(password + salt), never the password', () => {
    const c = createCredentials('example.com', 'alice', 'hunter2')
    expect(c.token).toBe(bytesToHex(md5(utf8ToBytes(`hunter2${c.salt}`))))
    expect(JSON.stringify(c)).not.toContain('hunter2')
  })
})

describe('SubsonicClient', () => {
  const client = new SubsonicClient({ url: 'https://example.com', username: 'alice', salt: 'abc', token: 'def' })
  afterEach(() => vi.unstubAllGlobals())

  const respond = (body: unknown, status = 200) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))

  it('builds authenticated URLs with array params', () => {
    const url = new URL(client.url('getAlbum', { id: '1', songId: ['a', 'b'], skip: undefined }))
    expect(url.pathname).toBe('/rest/getAlbum')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ u: 'alice', t: 'def', s: 'abc', c: 'CoffeeWeb', f: 'json', id: '1' })
    expect(url.searchParams.getAll('songId')).toEqual(['a', 'b'])
    expect(url.searchParams.has('skip')).toBe(false)
  })

  it('returns the subsonic-response body', async () => {
    respond({ 'subsonic-response': { status: 'ok', version: '1.16.1', foo: 1 } })
    await expect(client.get<{ foo: number }>('ping')).resolves.toMatchObject({ foo: 1 })
  })

  it('throws SubsonicError on status "failed"', async () => {
    respond({ 'subsonic-response': { status: 'failed', version: '1.16.1', error: { code: 40, message: 'Wrong username or password' } } })
    const err = await client.get('ping').catch((e) => e)
    expect(err).toBeInstanceOf(SubsonicError)
    expect(err.isAuthError).toBe(true)
    expect(err.message).toBe('Wrong username or password')
  })

  it('throws a helpful error when the server is unreachable or blocks CORS', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(client.get('ping')).rejects.toThrow(/CORS/)
  })

  it('rejects non-Subsonic responses', async () => {
    respond({ hello: 'world' })
    await expect(client.get('ping')).rejects.toThrow(/Subsonic/)
  })
})
