import { afterEach, describe, expect, it, vi } from 'vitest'
import { type Session, useSessionStore } from '@/stores/session'
import { SubsonicError, type SubsonicClient } from './client'
import { appendSongs, createPlaylistWithSongs } from './playlistSongs'

function setExtensions(extensions: string[]) {
  useSessionStore.setState({ session: { server: { extensions } } as unknown as Session })
}

function fakeClient(fail: (method: string, params: Record<string, unknown>) => boolean = () => false) {
  const get = vi.fn(async (method: string, params: Record<string, unknown> = {}) => {
    if (fail(method, params)) throw new SubsonicError(70, 'Not found')
    return method === 'createPlaylist' ? { playlist: { id: 'pl1', name: String(params.name) } } : {}
  })
  return { client: { get } as unknown as SubsonicClient, get }
}

afterEach(() => useSessionStore.setState({ session: null }))

describe('appendSongs', () => {
  it('sends one call on plain Navidrome', async () => {
    setExtensions([])
    const { client, get } = fakeClient()
    expect(await appendSongs(client, 'pl1', ['a', 'b'])).toEqual({ added: 2, failed: [] })
    expect(get).toHaveBeenCalledExactlyOnceWith('updatePlaylist', { playlistId: 'pl1', songIdToAdd: ['a', 'b'] })
  })

  it('goes one song per call, in order, behind Octo-Fiesta', async () => {
    setExtensions(['octoFiesta'])
    const { client, get } = fakeClient()
    await appendSongs(client, 'pl1', ['a', 'b', 'c'])
    expect(get.mock.calls.map((c) => c[1]?.songIdToAdd)).toEqual(['a', 'b', 'c'])
  })

  it('goes one by one for external songs even without the extension, and carries on past failures', async () => {
    setExtensions([])
    const { client, get } = fakeClient((_, p) => p.songIdToAdd === 'ext-qobuz-song-2')
    const result = await appendSongs(client, 'pl1', ['a', 'ext-qobuz-song-2', 'c'])
    expect(result).toEqual({ added: 2, failed: ['ext-qobuz-song-2'] })
    expect(get).toHaveBeenCalledTimes(3)
  })

  it('throws when nothing could be added', async () => {
    setExtensions(['octoFiesta'])
    const { client } = fakeClient(() => true)
    await expect(appendSongs(client, 'pl1', ['a', 'b'])).rejects.toThrow(/any of the songs/)
  })
})

describe('createPlaylistWithSongs', () => {
  it('creates with all songs in one call on plain Navidrome', async () => {
    setExtensions([])
    const { client, get } = fakeClient()
    await createPlaylistWithSongs(client, 'Mix', ['a', 'b'])
    expect(get).toHaveBeenCalledExactlyOnceWith('createPlaylist', { name: 'Mix', songId: ['a', 'b'] })
  })

  it('creates empty and then adds songs behind Octo-Fiesta, keeping the playlist on failures', async () => {
    setExtensions(['octoFiesta'])
    const { client, get } = fakeClient((m) => m === 'updatePlaylist')
    const result = await createPlaylistWithSongs(client, 'Mix', ['a', 'b'])
    expect(get.mock.calls[0]).toEqual(['createPlaylist', { name: 'Mix' }])
    expect(result).toMatchObject({ playlist: { id: 'pl1' }, added: 0, failed: ['a', 'b'] })
  })
})
