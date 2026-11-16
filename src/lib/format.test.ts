import { describe, expect, it } from 'vitest'
import { formatDuration, formatTotalDuration, plural, stripHtml } from './format'

describe('format', () => {
  it('formats track durations', () => {
    expect(formatDuration(189)).toBe('3:09')
    expect(formatDuration(3725)).toBe('1:02:05')
    expect(formatDuration(undefined)).toBe('–:––')
  })
  it('formats total durations', () => {
    expect(formatTotalDuration(3725)).toBe('1 hr 2 min')
    expect(formatTotalDuration(20)).toBe('1 min')
  })
  it('pluralises', () => {
    expect(plural(1, 'song')).toBe('1 song')
    expect(plural(1200, 'song')).toBe('1,200 songs')
  })
  it('strips html', () => {
    expect(stripHtml('Great band. <a href="https://last.fm">Read more on Last.fm</a>')).toBe('Great band. Read more on Last.fm')
  })
})
