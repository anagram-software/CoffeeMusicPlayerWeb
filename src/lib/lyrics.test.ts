import { describe, expect, it } from 'vitest'
import { activeLineIndex, fromStructured, isSectionHeader, parseLrc } from './lyrics'

describe('parseLrc', () => {
  it('parses timestamps, multiple stamps per line and metadata', () => {
    const r = parseLrc('[ar:Someone]\n[00:01.50]Hello\n[00:05.00][00:10.25]Again\n[01:02]World')
    expect(r.synced).toBe(true)
    expect(r.lines).toEqual([
      { start: 1500, text: 'Hello' },
      { start: 5000, text: 'Again' },
      { start: 10250, text: 'Again' },
      { start: 62000, text: 'World' },
    ])
  })
  it('applies [offset] (positive = sooner)', () => {
    expect(parseLrc('[offset:+500]\n[00:02.00]x').lines[0].start).toBe(1500)
  })
  it('treats text without timestamps as unsynced', () => {
    const r = parseLrc('\nLine one\n\nLine two\n')
    expect(r.synced).toBe(false)
    expect(r.lines.map((l) => l.text)).toEqual(['Line one', '', 'Line two'])
  })
})

describe('fromStructured', () => {
  it('prefers synced main lyrics and applies offset', () => {
    const r = fromStructured({
      structuredLyrics: [
        { lang: 'eng', synced: false, line: [{ value: 'plain' }] },
        { lang: 'eng', synced: true, offset: 100, line: [{ start: 1000, value: 'timed' }] },
      ],
    } as never)!
    expect(r.synced).toBe(true)
    expect(r.lines).toEqual([{ start: 900, text: 'timed' }])
  })
  it('returns null when empty', () => expect(fromStructured({ structuredLyrics: [] } as never)).toBeNull())
})

describe('activeLineIndex', () => {
  const lines = [{ start: 1000, text: 'a' }, { start: 2000, text: 'b' }, { start: 3000, text: 'c' }]
  it.each([
    [500, -1],
    [1000, 0],
    [2500, 1],
    [9999, 2],
  ])('at %ims → %i', (t, i) => expect(activeLineIndex(lines, t)).toBe(i))
})

describe('isSectionHeader', () => {
  it('recognises section labels', () => {
    expect(isSectionHeader('[Chorus]')).toBe(true)
    expect(isSectionHeader('Verse 2')).toBe(true)
    expect(isSectionHeader('I hate to turn up out of the blue')).toBe(false)
  })
})
