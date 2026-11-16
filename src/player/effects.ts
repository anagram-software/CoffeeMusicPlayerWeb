import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/*
 * Audio effects, mirroring the Android app's EQ screen: a 5-band equalizer,
 * bass boost, virtualizer (stereo widening) and preset reverb, built from
 * Web Audio nodes:
 *
 *   <audio> ×2 → input → 5 × peaking EQ → bass (low shelf) → widener
 *     → dry ─┬→ limiter → speakers
 *     → reverb (convolver) → wet ─┘
 *
 * Off by default, and off means off: no AudioContext exists and audio plays
 * straight from the <audio> elements. Routing an element into Web Audio
 * can't be undone, so turning effects off closes the context and the engine
 * swaps in fresh elements (see AudioEngine.disableEffects).
 */

/** Same centre frequencies as the Android equalizer. */
export const EQ_BANDS = [60, 230, 910, 3600, 14000] as const
export const EQ_MAX_DB = 12

/** The standard Android equalizer presets (dB per band). */
export const EQ_PRESETS: Record<string, number[]> = {
  Normal: [3, 0, 0, 0, 3],
  Classical: [5, 3, -2, 4, 4],
  Dance: [6, 0, 2, 4, 1],
  Flat: [0, 0, 0, 0, 0],
  Folk: [3, 0, 0, 2, -1],
  'Heavy Metal': [4, 1, 9, 3, 0],
  'Hip Hop': [5, 3, 0, 1, 3],
  Jazz: [4, 2, -2, 2, 5],
  Pop: [-1, 2, 5, 1, -2],
  Rock: [5, 3, -1, 3, 5],
}

/** Android PresetReverb options, approximated with generated impulse responses. */
export const REVERB_PRESETS = {
  none: { label: 'None', seconds: 0, wet: 0, bright: false },
  smallRoom: { label: 'Small room', seconds: 0.4, wet: 0.18, bright: false },
  mediumRoom: { label: 'Medium room', seconds: 0.8, wet: 0.22, bright: false },
  largeRoom: { label: 'Large room', seconds: 1.3, wet: 0.25, bright: false },
  mediumHall: { label: 'Medium hall', seconds: 1.9, wet: 0.28, bright: false },
  largeHall: { label: 'Large hall', seconds: 2.8, wet: 0.3, bright: false },
  plate: { label: 'Plate', seconds: 1.5, wet: 0.25, bright: true },
} as const
export type ReverbPreset = keyof typeof REVERB_PRESETS

interface EffectsState {
  enabled: boolean
  /** A key of EQ_PRESETS, or "Custom" once bands are moved by hand. */
  preset: string
  gains: number[]
  bassBoost: { enabled: boolean; strength: number }
  virtualizer: { enabled: boolean; strength: number }
  reverb: ReverbPreset
}

export const useEffectsStore = create<EffectsState>()(
  persist(
    (): EffectsState => ({
      enabled: false,
      preset: 'Flat',
      gains: [...EQ_PRESETS.Flat],
      bassBoost: { enabled: false, strength: 0.5 },
      virtualizer: { enabled: false, strength: 0.5 },
      reverb: 'none',
    }),
    { name: 'coffee.effects' },
  ),
)

const RAMP = 0.05 // seconds; smooths parameter changes to avoid clicks

class EffectsGraph {
  private ctx: AudioContext | null = null
  private attached = new WeakSet<HTMLMediaElement>()
  private filters: BiquadFilterNode[] = []
  private bass!: BiquadFilterNode
  private width!: { same: GainNode[]; cross: GainNode[] }
  private convolver!: ConvolverNode
  private wet!: GainNode
  private input!: GainNode
  private currentReverb: ReverbPreset | null = null

  get active() {
    return this.ctx !== null
  }

  /** Builds the graph (once) and routes the given elements through it. Call from a user gesture. */
  attach(elements: HTMLMediaElement[]) {
    if (!this.ctx) this.build()
    const ctx = this.ctx!
    for (const el of elements) {
      if (this.attached.has(el)) continue
      ctx.createMediaElementSource(el).connect(this.input)
      this.attached.add(el)
    }
    this.apply(useEffectsStore.getState())
    void this.resume()
  }

  /** Tears the graph down. The attached elements must no longer be used (they'd be silent). */
  async detach() {
    const ctx = this.ctx
    this.ctx = null
    this.attached = new WeakSet()
    this.currentReverb = null
    await ctx?.close()
  }

  /** Browsers start/suspend audio contexts without a user gesture; resume before playing. */
  resume() {
    return this.ctx?.state === 'suspended' ? this.ctx.resume() : Promise.resolve()
  }

  private build() {
    const ctx = new AudioContext()
    this.ctx = ctx

    // Force stereo so mono files are widened/reverbed properly.
    this.input = new GainNode(ctx, { channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers' })

    this.filters = EQ_BANDS.map((frequency, i) =>
      new BiquadFilterNode(ctx, {
        // Shelves at the ends, like most hardware EQs, peaks in between.
        type: i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking',
        frequency,
        Q: 1,
        gain: 0,
      }),
    )
    this.bass = new BiquadFilterNode(ctx, { type: 'lowshelf', frequency: 120, gain: 0 })

    // Widener: L' = a·L + b·R, R' = a·R + b·L with a = (1+w)/2, b = (1−w)/2. w = 1 is unchanged.
    const splitter = new ChannelSplitterNode(ctx, { numberOfOutputs: 2 })
    const merger = new ChannelMergerNode(ctx, { numberOfInputs: 2 })
    const same = [new GainNode(ctx, { gain: 1 }), new GainNode(ctx, { gain: 1 })]
    const cross = [new GainNode(ctx, { gain: 0 }), new GainNode(ctx, { gain: 0 })]
    splitter.connect(same[0], 0).connect(merger, 0, 0) // L → L'
    splitter.connect(cross[0], 1).connect(merger, 0, 0) // R → L'
    splitter.connect(same[1], 1).connect(merger, 0, 1) // R → R'
    splitter.connect(cross[1], 0).connect(merger, 0, 1) // L → R'
    this.width = { same, cross }

    this.convolver = new ConvolverNode(ctx)
    this.wet = new GainNode(ctx, { gain: 0 })
    // A gentle limiter keeps boosted bands from clipping.
    const limiter = new DynamicsCompressorNode(ctx, { threshold: -1, knee: 0, ratio: 20, attack: 0.003, release: 0.1 })

    let node: AudioNode = this.input
    for (const f of [...this.filters, this.bass]) node = node.connect(f)
    node.connect(splitter)
    merger.connect(limiter)
    merger.connect(this.convolver).connect(this.wet).connect(limiter)
    limiter.connect(ctx.destination)
  }

  apply(s: EffectsState) {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime
    const on = s.enabled
    this.filters.forEach((f, i) => f.gain.setTargetAtTime(on ? (s.gains[i] ?? 0) : 0, t, RAMP))
    this.bass.gain.setTargetAtTime(on && s.bassBoost.enabled ? s.bassBoost.strength * EQ_MAX_DB : 0, t, RAMP)

    const w = on && s.virtualizer.enabled ? 1 + s.virtualizer.strength : 1
    for (const g of this.width.same) g.gain.setTargetAtTime((1 + w) / 2, t, RAMP)
    for (const g of this.width.cross) g.gain.setTargetAtTime((1 - w) / 2, t, RAMP)

    const reverb = on ? s.reverb : 'none'
    if (reverb !== 'none' && reverb !== this.currentReverb) {
      this.convolver.buffer = impulseResponse(ctx, REVERB_PRESETS[reverb])
      this.currentReverb = reverb
    }
    this.wet.gain.setTargetAtTime(REVERB_PRESETS[reverb].wet, t, RAMP)
  }
}

/** Decaying stereo noise: a cheap synthetic room/hall impulse response. */
function impulseResponse(ctx: BaseAudioContext, { seconds, bright }: { seconds: number; bright: boolean }) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    let last = 0
    for (let i = 0; i < length; i++) {
      const noise = Math.random() * 2 - 1
      // Rooms/halls lose highs as they decay; a plate stays bright.
      last = bright ? noise : last + (noise - last) * 0.25
      data[i] = last * (1 - i / length) ** 3
    }
  }
  return buffer
}

export const effects = new EffectsGraph()

useEffectsStore.subscribe((s) => effects.apply(s))
