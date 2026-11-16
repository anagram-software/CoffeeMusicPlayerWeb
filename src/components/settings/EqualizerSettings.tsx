import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { EQ_BANDS, EQ_MAX_DB, EQ_PRESETS, REVERB_PRESETS, type ReverbPreset, useEffectsStore } from '@/player/effects'
import { player } from '@/player/engine'
import { Row, SettingsGroup } from './SettingsLayout'

const set = useEffectsStore.setState

/**
 * Compact equalizer (the Android EQ screen's controls, condensed). Off by
 * default; the controls only show while it's on.
 */
export function EqualizerSettings() {
  const { enabled, preset, gains, bassBoost, virtualizer, reverb } = useEffectsStore()

  const toggle = (on: boolean) => {
    set({ enabled: on })
    // On: this click is the user gesture browsers require to start Web Audio.
    // Off: take Web Audio out of the playback path completely.
    if (on) player.enableEffects()
    else player.disableEffects()
  }

  return (
    <SettingsGroup title="Equalizer" id="equalizer">
      <Row label="Sound effects" description="Equalizer, bass boost, virtualizer and reverb, in this browser.">
        <Switch checked={enabled} onCheckedChange={toggle} aria-label="Enable sound effects" />
      </Row>

      {enabled && (
        <>
          <Row label="Preset">
            <Select value={preset} onValueChange={(name) => EQ_PRESETS[name] && set({ preset: name, gains: [...EQ_PRESETS[name]] })}>
              <SelectTrigger size="sm" className="w-36" aria-label="Preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {Object.keys(EQ_PRESETS).map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
                {preset === 'Custom' && <SelectItem value="Custom">Custom</SelectItem>}
              </SelectContent>
            </Select>
          </Row>

          <div className="grid grid-cols-5 gap-2 py-3">
            {EQ_BANDS.map((hz, i) => {
              const label = hz >= 1000 ? `${hz / 1000}k` : String(hz)
              return (
                <div key={hz} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {gains[i] > 0 ? '+' : ''}
                    {gains[i]}
                  </span>
                  <Slider
                    orientation="vertical"
                    min={-EQ_MAX_DB}
                    max={EQ_MAX_DB}
                    step={0.5}
                    value={[gains[i]]}
                    aria-label={`${label} Hz gain`}
                    onValueChange={([v]) => {
                      const next = [...gains]
                      next[i] = v
                      set({ gains: next, preset: 'Custom' })
                    }}
                    className="data-vertical:h-24 data-vertical:min-h-24"
                  />
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </div>
              )
            })}
          </div>

          <EffectRow label="Bass boost" value={bassBoost} onChange={(v) => set({ bassBoost: { ...bassBoost, ...v } })} />
          <EffectRow label="Virtualizer" value={virtualizer} onChange={(v) => set({ virtualizer: { ...virtualizer, ...v } })} />

          <Row label="Reverb">
            <Select value={reverb} onValueChange={(v) => set({ reverb: v as ReverbPreset })}>
              <SelectTrigger size="sm" className="w-36" aria-label="Reverb">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {Object.entries(REVERB_PRESETS).map(([key, p]) => (
                  <SelectItem key={key} value={key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        </>
      )}
    </SettingsGroup>
  )
}

/** One line: label, strength slider, on/off switch. */
function EffectRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: { enabled: boolean; strength: number }
  onChange: (v: Partial<{ enabled: boolean; strength: number }>) => void
}) {
  return (
    <Row label={label}>
      <div className="flex items-center gap-3">
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[value.strength]}
          disabled={!value.enabled}
          onValueChange={([v]) => onChange({ strength: v })}
          aria-label={`${label} strength`}
          className="w-28"
        />
        <Switch checked={value.enabled} onCheckedChange={(v) => onChange({ enabled: v })} aria-label={label} />
      </div>
    </Row>
  )
}
