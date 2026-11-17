import type { StreamFormat } from '@/stores/settings'
import type { Track } from './queue'

const LOSSLESS = new Set(['flac', 'alac', 'wav', 'aiff', 'aif', 'ape', 'wv', 'dsf', 'dff'])

function kHz(hz: number) {
  const k = hz / 1000
  return `${Number.isInteger(k) ? k : k.toFixed(1)} kHz`
}

/**
 * One-line description of a track's file and how it's being streamed, e.g.
 * "FLAC · 24-bit · 96 kHz", "MP3 · 320 kbps", or with server transcoding
 * "FLAC · 16-bit · 44.1 kHz → OPUS 192 kbps". Null when nothing is known.
 */
export function describeQuality(
  t: Pick<Track, 'suffix' | 'bitRate' | 'samplingRate' | 'bitDepth' | 'channelCount'>,
  stream: { streamFormat: StreamFormat; maxBitRate: number } = { streamFormat: 'raw', maxBitRate: 0 },
): string | null {
  const format = t.suffix?.toUpperCase()
  if (!format) return null
  const lossless = (t.bitDepth ?? 0) > 0 || LOSSLESS.has(t.suffix!.toLowerCase())

  const parts = [format]
  if (lossless) {
    if (t.bitDepth) parts.push(`${t.bitDepth}-bit`)
    if (t.samplingRate) parts.push(kHz(t.samplingRate))
  } else if (t.bitRate) {
    parts.push(`${t.bitRate} kbps`)
  }
  if (t.channelCount === 1) parts.push('Mono')
  let label = parts.join(' · ')

  // What the server actually sends, if the playback settings make it transcode.
  const { streamFormat, maxBitRate } = stream
  if (streamFormat !== 'raw' && streamFormat !== t.suffix?.toLowerCase()) {
    label += ` → ${streamFormat.toUpperCase()}${maxBitRate ? ` ${maxBitRate} kbps` : ''}`
  } else if (maxBitRate && (lossless || (t.bitRate ?? 0) > maxBitRate)) {
    label += ` → ${maxBitRate} kbps`
  }
  return label
}
