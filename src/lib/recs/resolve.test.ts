import type { AlbumID3, ArtistID3 } from 'subsonic-api'
import { describe, expect, it } from 'vitest'
import type { RecItem } from './client'
import { hiddenBy } from './feedback'
import { reasonText } from './reason'
import { creditNames, pickAlbum, pickArtist } from './resolve'

const artist = (id: string, name: string) => ({ id, name }) as ArtistID3
const album = (id: string, name: string, artistName: string) => ({ id, name, artist: artistName }) as AlbumID3
const item = (mbid: string, credit: string[] = []): RecItem => ({
  mbid,
  kind: 'release-group',
  name: 'x',
  reason: [],
  musicbrainz_url: '',
  artist_credit: credit.map((c) => ({ mbid: c, name: c.toUpperCase() })),
})

describe('pickArtist', () => {
  it('needs the same name, ignoring case, accents and "The"', () => {
    expect(pickArtist('The Beatles', [artist('1', 'Beatles Revival'), artist('2', 'beatles')])?.id).toBe('2')
    expect(pickArtist('Beyoncé', [artist('1', 'Beyonce')])?.id).toBe('1')
    expect(pickArtist('Hole', [artist('1', 'Holes')])).toBeUndefined()
  })

  it('prefers the library over streaming results', () => {
    expect(pickArtist('Sia', [artist('ext-qobuz-artist-9', 'Sia'), artist('lib1', 'Sia')])?.id).toBe('lib1')
  })
})

describe('pickAlbum', () => {
  const wanted = { title: 'Future Nostalgia', artists: ['Dua Lipa'] }

  it('matches title and artist, library first', () => {
    const found = [album('ext-qobuz-album-1', 'Future Nostalgia', 'Dua Lipa'), album('lib', 'Future Nostalgia', 'Dua Lipa')]
    expect(pickAlbum(wanted, found)?.id).toBe('lib')
  })

  it('refuses other artists’ albums of the same name', () => {
    expect(pickAlbum(wanted, [album('1', 'Future Nostalgia', 'Karaoke Stars')])).toBeUndefined()
  })

  it('prefers the exact edition, then falls back to a deluxe or remaster', () => {
    const deluxe = album('d', 'Future Nostalgia (Deluxe)', 'Dua Lipa')
    expect(pickAlbum(wanted, [deluxe, album('e', 'Future Nostalgia', 'Dua Lipa')])?.id).toBe('e')
    expect(pickAlbum(wanted, [deluxe])?.id).toBe('d')
  })

  it('accepts albums credited to several artists', () => {
    expect(pickAlbum(wanted, [album('1', 'Future Nostalgia', 'Dua Lipa feat. Someone')])?.id).toBe('1')
  })
})

describe('creditNames', () => {
  it('lists credited names', () => {
    expect(creditNames(item('rg', ['a', 'b']))).toEqual(['A', 'B'])
    expect(creditNames({ ...item('rg'), artist_credit: null })).toEqual([])
  })
})

describe('hiddenBy', () => {
  it('hides the item itself and anything credited to a dismissed artist', () => {
    const dismissed = new Set(['artist1'])
    expect(hiddenBy(item('artist1'), dismissed)).toBe(true)
    expect(hiddenBy(item('rg', ['artist2', 'artist1']), dismissed)).toBe(true)
    expect(hiddenBy(item('rg', ['artist2']), dismissed)).toBe(false)
  })
})

describe('reasonText', () => {
  it('drops the step the card already shows', () => {
    const rec = (reason: string[]) => ({ ...item('x'), reason })
    expect(reasonText(rec(['By Ariana Grande', 'You have Dua Lipa', 'Listeners of Dua Lipa also play Ariana Grande']))).toBe(
      'You have Dua Lipa · Listeners of Dua Lipa also play Ariana Grande',
    )
    expect(reasonText(rec(['New from Martin Garrix']))).toBe('')
    expect(reasonText(rec(['A top track by Sia', 'You have Kygo']))).toBe('You have Kygo')
  })
})
