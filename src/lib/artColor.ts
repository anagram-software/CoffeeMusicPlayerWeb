import { useQuery } from '@tanstack/react-query'
import { useSubsonic } from '@/stores/session'

type RGB = [number, number, number]

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

/**
 * Picks a representative colour from pixel data: pixels are bucketed by
 * colour, and buckets are scored by size with a bonus for saturation, so a
 * vivid accent can beat a large grey background (like Palette's "vibrant").
 */
export function dominantColor(data: Uint8ClampedArray): RGB | null {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    bucket.n++
    bucket.r += r
    bucket.g += g
    bucket.b += b
    buckets.set(key, bucket)
  }
  let best: RGB | null = null
  let bestScore = -1
  for (const { n, r, g, b } of buckets.values()) {
    const rgb: RGB = [r / n, g / n, b / n]
    const [, s, l] = rgbToHsl(rgb)
    // Near-black and near-white make poor tints.
    const lightnessPenalty = l < 0.08 || l > 0.92 ? 0.1 : 1
    const score = n * (0.25 + s) * lightnessPenalty
    if (score > bestScore) {
      bestScore = score
      best = rgb
    }
  }
  return best
}

/** A dark background tint derived from a colour, readable under white text. */
export type TintVariant = 'dark' | 'light'

/**
 * A tint with the colour's hue: dark (readable under white text: the full
 * player, the dark-mode bar) or a light pastel (readable under dark text:
 * the light-mode bar).
 */
export function tintFromColor(rgb: RGB, variant: TintVariant = 'dark'): string {
  const [h, s] = rgbToHsl(rgb)
  const hue = Math.round(h)
  return variant === 'dark'
    ? `hsl(${hue} ${Math.round(Math.min(s, 0.7) * 100)}% 24%)`
    : `hsl(${hue} ${Math.round(Math.min(s, 0.65) * 100)}% 89%)`
}

async function extractColor(url: string): Promise<RGB | null> {
  const img = new Image()
  img.crossOrigin = 'anonymous' // Navidrome sends CORS headers, so the canvas stays readable.
  img.src = url
  await img.decode()
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, size, size)
  return dominantColor(ctx.getImageData(0, 0, size, size).data)
}

/** Background tint for a cover, like the Android player's Palette colours. Null until known. */
export function useArtColor(coverArt: string | undefined, variant: TintVariant = 'dark'): string | null {
  const client = useSubsonic()
  const { data } = useQuery({
    queryKey: ['artColor', coverArt],
    queryFn: () => extractColor(client.coverArtUrl(coverArt, 64)!),
    enabled: !!coverArt,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
  })
  return data ? tintFromColor(data, variant) : null
}
