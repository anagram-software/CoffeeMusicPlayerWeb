import type { Child } from 'subsonic-api'
import { describe, expect, it } from 'vitest'
import { artistMatches, coreTitle, normalise, pickMatch, searchTitle } from './match'

const song = (id: string, title: string, artist: string, album = 'Album'): Child => ({ id, title, artist, album, isDir: false }) as Child

describe('normalise', () => {
  it('drops case, accents and punctuation', () => {
    expect(normalise('Beyoncé – Déjà Vu!')).toBe('beyonce deja vu')
    expect(normalise('Simon & Garfunkel')).toBe('simon and garfunkel')
  })
})

describe('coreTitle', () => {
  it.each([
    ['Come Together (Remastered 2009)', 'come together'],
    ['Come Together - 2019 Mix Remastered', 'come together'],
    ['Get Lucky (feat. Pharrell Williams)', 'get lucky'],
    ['Get Lucky feat. Pharrell Williams', 'get lucky'],
    ['Song [Explicit]', 'song'],
  ])('%s → %s', (input, expected) => expect(coreTitle(input)).toBe(expected))

  it('keeps qualifiers that mean a different recording', () => {
    expect(coreTitle('Song (Live at Wembley)')).toBe('song live at wembley')
    expect(coreTitle('Song - Acoustic')).toBe('song acoustic')
  })
})

describe('searchTitle', () => {
  it('removes bracketed and dashed suffixes', () => {
    expect(searchTitle('Come Together (Remastered 2009)')).toBe('Come Together')
    expect(searchTitle('Song - Radio Edit')).toBe('Song')
  })
})

describe('artistMatches', () => {
  it('matches the same artist with or without "The" and featured artists', () => {
    expect(artistMatches('The Beatles', 'Beatles')).toBe(true)
    expect(artistMatches('Daft Punk', 'Daft Punk feat. Pharrell Williams')).toBe(true)
    expect(artistMatches('Beyonce', 'Beyoncé')).toBe(true)
  })

  it('rejects different artists', () => {
    expect(artistMatches('Hole', 'Holes')).toBe(false)
    expect(artistMatches('Muse', 'Vitamin String Quartet')).toBe(false)
  })
})

describe('pickMatch', () => {
  const wanted = { artist: 'Radiohead', title: 'Karma Police' }

  it('prefers a library song over a streaming-provider one', () => {
    const picked = pickMatch(wanted, [song('ext-qobuz-song-1', 'Karma Police', 'Radiohead'), song('lib1', 'Karma Police (Remastered)', 'Radiohead')])
    expect(picked?.id).toBe('lib1')
  })

  it('falls back to a streaming-provider song', () => {
    expect(pickMatch(wanted, [song('ext-qobuz-song-1', 'Karma Police', 'Radiohead')])?.id).toBe('ext-qobuz-song-1')
  })

  it('prefers the exact title among equals', () => {
    const picked = pickMatch(wanted, [song('ext-qobuz-song-1', 'Karma Police (Remastered)', 'Radiohead'), song('ext-qobuz-song-2', 'Karma Police', 'Radiohead')])
    expect(picked?.id).toBe('ext-qobuz-song-2')
  })

  it('skips covers, other artists and other songs', () => {
    expect(
      pickMatch(wanted, [
        song('ext-qobuz-song-1', 'Karma Police (Karaoke Version)', 'Radiohead'),
        song('ext-qobuz-song-2', 'Karma Police', 'Vitamin String Quartet'),
        song('lib1', 'Paranoid Android', 'Radiohead'),
        song('lib2', 'Karma Police (Live)', 'Radiohead'),
      ]),
    ).toBeUndefined()
  })
})
