import { describe, expect, it } from 'vitest'
import { dominantColor, tintFromColor } from './artColor'

function pixels(...colors: [number, number, number, number][]) {
  return new Uint8ClampedArray(colors.flatMap(([r, g, b, n]) => Array.from({ length: n }, () => [r, g, b, 255]).flat()))
}

describe('dominantColor', () => {
  it('prefers a vivid colour over a slightly larger grey area', () => {
    const c = dominantColor(pixels([128, 128, 128, 60], [200, 30, 40, 40]))!
    expect(c[0]).toBeGreaterThan(150)
    expect(c[1]).toBeLessThan(60)
  })
  it('ignores near-black backgrounds', () => {
    const c = dominantColor(pixels([5, 5, 5, 90], [40, 90, 200, 10]))!
    expect(c[2]).toBeGreaterThan(150)
  })
  it('returns null for empty data', () => expect(dominantColor(new Uint8ClampedArray())).toBeNull())
})

describe('tintFromColor', () => {
  it('makes a dark tint with the same hue', () => {
    expect(tintFromColor([255, 0, 0])).toBe('hsl(0 60% 24%)')
  })
})
