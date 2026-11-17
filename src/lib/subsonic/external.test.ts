import { describe, expect, it } from 'vitest'
import { externalProvider, isExternalId } from './external'

describe('external ids (Octo-Fiesta)', () => {
  it('recognises provider ids', () => {
    expect(isExternalId('ext-qobuz-song-12345')).toBe(true)
    expect(externalProvider('ext-qobuz-album-9')).toBe('Qobuz')
    expect(externalProvider('ext-deezer-artist-1')).toBe('Deezer')
    expect(externalProvider('ext-newthing-song-1')).toBe('Newthing')
  })
  it('treats Navidrome ids as library items', () => {
    expect(isExternalId('12CyVV6UsF1YXW0YbJQiRe')).toBe(false)
    expect(isExternalId(undefined)).toBe(false)
    expect(externalProvider('al-4QZO6nBGty9odiq7pUok5n')).toBeUndefined()
  })
})
