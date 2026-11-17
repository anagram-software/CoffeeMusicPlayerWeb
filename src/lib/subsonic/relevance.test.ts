import { describe, expect, it } from 'vitest'
import { baseTitle, looksLikeCover, mergeEditions, releaseKind } from './relevance'

describe('looksLikeCover', () => {
  it.each([
    ['Billie Jean (Karaoke Version)'],
    ['A Tribute to Michael Jackson'],
    ['Thriller (Made Famous by Michael Jackson)'],
    ['Lullaby Renditions of Radiohead'],
    ['Rockabye Baby! Lullaby Renditions of Metallica'],
    ['Vitamin String Quartet Performs Muse'],
    ['Hits in the Style of Adele'],
    ['8-Bit Versions of Daft Punk'],
  ])('flags %s', (t) => expect(looksLikeCover(t)).toBe(true))

  it.each([['Thriller'], ['Karma Police'], ['Bitter Sweet Symphony'], ['Covered in Rain'], ['The Bit Where You Fall']])('keeps %s', (t) =>
    expect(looksLikeCover(t)).toBe(false),
  )

  it('checks every field given', () => expect(looksLikeCover('Billie Jean', 'Pop Hits', 'Karaoke Kings')).toBe(true))
})

describe('editions', () => {
  it('normalises edition suffixes', () => {
    expect(baseTitle('Thriller (25th Anniversary Edition)')).toBe('thriller')
    expect(baseTitle('OK Computer [Remastered]')).toBe('ok computer')
    expect(baseTitle('Nevermind - Deluxe Edition')).toBe('nevermind')
    expect(baseTitle('(What’s the Story) Morning Glory?')).toBe('(what’s the story) morning glory?')
  })
  it('keeps the edition with the most tracks', () => {
    const r = mergeEditions([
      { name: 'Thriller', songCount: 9 },
      { name: 'Thriller (Deluxe Edition)', songCount: 16 },
      { name: 'Bad', songCount: 11 },
    ])
    expect(r.map((a) => a.name)).toEqual(['Thriller (Deluxe Edition)', 'Bad'])
  })
})

describe('releaseKind', () => {
  it('groups by artist and length', () => {
    expect(releaseKind({ artist: 'Radiohead', songCount: 12 }, 'Radiohead')).toBe('album')
    expect(releaseKind({ artist: 'Radiohead', songCount: 2 }, 'Radiohead')).toBe('single')
    expect(releaseKind({ artist: 'Various Artists', songCount: 20 }, 'Radiohead')).toBe('appearsOn')
    expect(releaseKind({ artist: 'Radiohead & Friends', songCount: 10 }, 'Radiohead')).toBe('album')
  })
})
