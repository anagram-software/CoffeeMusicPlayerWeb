import { describe, expect, it } from 'vitest'
import { describeQuality } from './quality'

describe('describeQuality', () => {
  it('describes lossy files by bitrate', () => {
    expect(describeQuality({ suffix: 'mp3', bitRate: 320, samplingRate: 44100, bitDepth: 0, channelCount: 2 })).toBe('MP3 · 320 kbps')
  })
  it('describes lossless files by bit depth and sample rate', () => {
    expect(describeQuality({ suffix: 'flac', bitRate: 2304, samplingRate: 96000, bitDepth: 24, channelCount: 2 })).toBe('FLAC · 24-bit · 96 kHz')
    expect(describeQuality({ suffix: 'flac', samplingRate: 44100, bitDepth: 16 })).toBe('FLAC · 16-bit · 44.1 kHz')
  })
  it('notes mono', () => {
    expect(describeQuality({ suffix: 'mp3', bitRate: 128, channelCount: 1 })).toBe('MP3 · 128 kbps · Mono')
  })
  it('shows server transcoding', () => {
    const flac = { suffix: 'flac', samplingRate: 44100, bitDepth: 16 }
    expect(describeQuality(flac, { streamFormat: 'opus', maxBitRate: 192 })).toBe('FLAC · 16-bit · 44.1 kHz → OPUS 192 kbps')
    expect(describeQuality(flac, { streamFormat: 'raw', maxBitRate: 256 })).toBe('FLAC · 16-bit · 44.1 kHz → 256 kbps')
    // A cap above the file's bitrate changes nothing
    expect(describeQuality({ suffix: 'mp3', bitRate: 192 }, { streamFormat: 'raw', maxBitRate: 320 })).toBe('MP3 · 192 kbps')
  })
  it('returns null without a format', () => expect(describeQuality({})).toBeNull())
})
