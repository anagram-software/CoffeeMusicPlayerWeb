import { createFileRoute } from '@tanstack/react-router'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { EQ_BANDS, EQ_MAX_DB, EQ_PRESETS, REVERB_PRESETS, type ReverbPreset, useEffectsStore } from '@/player/effects'
import { player } from '@/player/engine'

export const Route = createFileRoute('/_app/equalizer')({
  staticData: { section: 'equalizer' },
  component: EqualizerPage,
})

const set = useEffectsStore.setState

function formatHz(hz: number) {
  return hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`
}

/** After the Android frag_equalizer: presets, 5 vertical bands, virtualizer, bass boost, reverb. */
function EqualizerPage() {
  const { enabled, preset, gains, bassBoost, virtualizer, reverb } = useEffectsStore()

  const toggle = (on: boolean) => {
    // This click is the user gesture browsers require before starting Web Audio.
    if (on) player.enableEffects()
    set({ enabled: on })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 md:px-6">
      <div className="flex items-center justify-between py-4">
        <div>
          <h1 className="text-lg font-light">Sound effects</h1>
          <p className="text-xs text-muted-foreground">Applies to everything you play in this browser.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} aria-label="Enable sound effects" />
      </div>

      <div className={cn('flex flex-col gap-8 transition-opacity', !enabled && 'pointer-events-none opacity-40')} aria-disabled={!enabled}>
        <section>
          <Select
            value={preset}
            onValueChange={(name) => EQ_PRESETS[name] && set({ preset: name, gains: [...EQ_PRESETS[name]] })}
            disabled={!enabled}
          >
            <SelectTrigger className="w-full sm:w-56" aria-label="Preset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(EQ_PRESETS).map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
              {preset === 'Custom' && <SelectItem value="Custom">Custom</SelectItem>}
            </SelectContent>
          </Select>

          <div className="mt-6 grid grid-cols-5 gap-2">
            {EQ_BANDS.map((hz, i) => (
              <div key={hz} className="flex flex-col items-center gap-3">
                <span className="text-xs text-muted-foreground">{formatHz(hz)}</span>
                <Slider
                  orientation="vertical"
                  min={-EQ_MAX_DB}
                  max={EQ_MAX_DB}
                  step={0.5}
                  value={[gains[i]]}
                  disabled={!enabled}
                  aria-label={`${formatHz(hz)} gain`}
                  onValueChange={([v]) => {
                    const next = [...gains]
                    next[i] = v
                    set({ gains: next, preset: 'Custom' })
                  }}
                  className="h-48 min-h-48"
                />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {gains[i] > 0 ? '+' : ''}
                  {gains[i]}dB
                </span>
              </div>
            ))}
          </div>
        </section>

        <EffectSlider
          label="Virtualizer"
          description="Widens the stereo image"
          value={virtualizer}
          disabled={!enabled}
          onChange={(v) => set({ virtualizer: { ...virtualizer, ...v } })}
        />
        <EffectSlider
          label="Bass Boost"
          description={`Up to +${EQ_MAX_DB} dB below 120 Hz`}
          value={bassBoost}
          disabled={!enabled}
          onChange={(v) => set({ bassBoost: { ...bassBoost, ...v } })}
        />

        <section>
          <div className="mb-2 text-sm">Reverb</div>
          <Select value={reverb} onValueChange={(v) => set({ reverb: v as ReverbPreset })} disabled={!enabled}>
            <SelectTrigger className="w-full sm:w-56" aria-label="Reverb">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REVERB_PRESETS).map(([key, p]) => (
                <SelectItem key={key} value={key}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>
      </div>
    </div>
  )
}

function EffectSlider({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string
  description: string
  value: { enabled: boolean; strength: number }
  disabled: boolean
  onChange: (v: Partial<{ enabled: boolean; strength: number }>) => void
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        <Switch checked={value.enabled} disabled={disabled} onCheckedChange={(v) => onChange({ enabled: v })} aria-label={label} />
      </div>
      <Slider
        min={0}
        max={1}
        step={0.01}
        value={[value.strength]}
        disabled={disabled || !value.enabled}
        onValueChange={([v]) => onChange({ strength: v })}
        aria-label={`${label} strength`}
      />
    </section>
  )
}
