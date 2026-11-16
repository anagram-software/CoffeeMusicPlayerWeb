import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { MdLogout } from 'react-icons/md'
import { EqualizerSettings } from '@/components/settings/EqualizerSettings'
import { Row, SettingsGroup } from '@/components/settings/SettingsLayout'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useSessionStore } from '@/stores/session'
import { maxBitRates, type StreamFormat, streamFormats, useSettingsStore } from '@/stores/settings'

export const Route = createFileRoute('/_app/settings')({
  staticData: { section: 'settings' },
  component: SettingsPage,
})

function SettingsPage() {
  const session = useSessionStore((s) => s.session)
  const logout = useSessionStore((s) => s.logout)
  const navigate = useNavigate()
  if (!session) return null

  const { credentials, server, user } = session

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 md:px-6">
      <SettingsGroup title="Server">
        <Row label="Address" value={credentials.url} />
        <Row label="Server" value={`${server.type} ${server.version}`} />
        <Row
          label="OpenSubsonic"
          value={server.openSubsonic ? `Yes · ${server.extensions.length} extensions` : 'No'}
          title={server.extensions.join(', ')}
        />
      </SettingsGroup>

      <PlaybackSettings />
      <EqualizerSettings />
      <LyricsSettings />

      <SettingsGroup title="Account">
        <Row label="Signed in as" value={user.isAdmin ? `${user.name} (admin)` : user.name} />
        <div className="py-3">
          <Button
            variant="outline"
            onClick={() => {
              logout()
              navigate({ to: '/login' })
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
    <SettingsGroup title="Lyrics">
      <Row
        label="Find missing lyrics online"
        description="When your server has no lyrics for a song, look them up on lrclib.net. This sends the song's title, artist and album to that service."
      >
        <Switch checked={lrclib} onCheckedChange={(v) => set({ lrclib: v })} aria-label="Find missing lyrics online" />
      </Row>
    </SettingsGroup>
  )
}
