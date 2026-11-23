import { useEffect, useRef } from 'react'
import { MdLogout } from 'react-icons/md'
import { EqualizerSettings } from './EqualizerSettings'
import { RecsSettings } from './RecsSettings'
import { Row, SettingsGroup } from './SettingsLayout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useSessionStore } from '@/stores/session'
import { maxBitRates, type StreamFormat, streamFormats, type Theme, themes, useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'

/**
 * Settings, as a modal opened from the top bar's gear (or deep-linked to a
 * section, e.g. the full player's equalizer button). Always uses the Settings
 * accent, whatever page it opens over.
 */
export function SettingsDialog() {
  const open = useUiStore((s) => s.settingsOpen)
  return (
    <Dialog open={open} onOpenChange={(settingsOpen) => useUiStore.setState({ settingsOpen })}>
      <DialogContent
        data-section="settings"
        className="flex max-h-[min(85dvh,52rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="text-lg font-light">Settings</DialogTitle>
          <DialogDescription className="sr-only">Server, playback, equalizer, lyrics, recommendations and account settings</DialogDescription>
        </DialogHeader>
        {open && <SettingsContent />}
      </DialogContent>
    </Dialog>
  )
}

function SettingsContent() {
  const session = useSessionStore((s) => s.session)
  const logout = useSessionStore((s) => s.logout)
  const section = useUiStore((s) => s.settingsSection)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (section) scrollRef.current?.querySelector(`#${section}`)?.scrollIntoView({ block: 'start' })
  }, [section])

  if (!session) return null
  const { credentials, server, user } = session

  return (
    <div ref={scrollRef} className="min-h-0 overflow-y-auto px-5 pb-6">
      <SettingsGroup title="Server">
        <Row label="Address" value={credentials.url} />
        <Row label="Server" value={`${server.type} ${server.version}`} />
        <Row
          label="OpenSubsonic"
          value={server.openSubsonic ? `Yes · ${server.extensions.length} extensions` : 'No'}
          title={server.extensions.join(', ')}
        />
      </SettingsGroup>

      <AppearanceSettings />
      <PlaybackSettings />
      <EqualizerSettings />
      <LyricsSettings />
      <RecsSettings />

      <SettingsGroup title="Account">
        <Row label="Signed in as" value={user.isAdmin ? `${user.name} (admin)` : user.name} />
        <div className="py-3">
          <Button
            variant="outline"
            onClick={() => {
              useUiStore.setState({ settingsOpen: false })
              logout() // AppShell redirects to /login
            }}
          >
            <MdLogout /> Sign out
          </Button>
        </div>
      </SettingsGroup>

      <SettingsGroup title="About">
        <Row label="Version" value={__APP_VERSION__} />
      </SettingsGroup>
    </div>
  )
}

function AppearanceSettings() {
  const { theme, showQuality, set } = useSettingsStore()
  return (
    <SettingsGroup title="Appearance" id="appearance">
      <Row label="Theme" description="System follows your device's light or dark mode.">
        <Select value={theme} onValueChange={(v) => set({ theme: v as Theme })}>
          <SelectTrigger className="w-36" aria-label="Theme">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {Object.entries(themes).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>
      <Row label="Show audio quality" description="Format and quality under the artwork in the full player, e.g. FLAC · 24-bit · 96 kHz.">
        <Switch checked={showQuality} onCheckedChange={(v) => set({ showQuality: v })} aria-label="Show audio quality" />
      </Row>
    </SettingsGroup>
  )
}

function PlaybackSettings() {
  const { streamFormat, maxBitRate, scrobble, set } = useSettingsStore()
  return (
    <SettingsGroup title="Playback">
      <Row label="Streaming format" description="Original sends files as they are; others ask the server to transcode.">
        <Select value={streamFormat} onValueChange={(v) => set({ streamFormat: v as StreamFormat })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {Object.entries(streamFormats).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>
      <Row label="Maximum bitrate" description="Applies to tracks played after the change.">
        <Select value={String(maxBitRate)} onValueChange={(v) => set({ maxBitRate: Number(v) as (typeof maxBitRates)[number] })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {maxBitRates.map((b) => (
              <SelectItem key={b} value={String(b)}>
                {b === 0 ? 'No limit' : `${b} kbps`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>
      <Row label="Scrobble plays" description="Updates play counts and forwards to Last.fm / ListenBrainz if set up in Navidrome.">
        <Switch checked={scrobble} onCheckedChange={(v) => set({ scrobble: v })} aria-label="Scrobble plays" />
      </Row>
    </SettingsGroup>
  )
}

function LyricsSettings() {
  const { lrclib, set } = useSettingsStore()
  return (
    <SettingsGroup title="Lyrics" id="lyrics">
      <Row
        label="Find missing lyrics online"
        description="When your server has no lyrics for a song, look them up on lrclib.net. This sends the song's title, artist and album to that service."
      >
        <Switch checked={lrclib} onCheckedChange={(v) => set({ lrclib: v })} aria-label="Find missing lyrics online" />
      </Row>
    </SettingsGroup>
  )
}

