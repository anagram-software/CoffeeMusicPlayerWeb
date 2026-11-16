import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { MdLogout } from 'react-icons/md'
import { Button } from '@/components/ui/button'
import { useSessionStore } from '@/stores/session'

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

/** Uppercase accent-coloured category header, like the Android PreferenceCategory. */
function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-1 text-xs font-medium tracking-wider text-section uppercase">{title}</h2>
      <div className="divide-y divide-border">{children}</div>
    </section>
  )
}

function Row({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3" title={title}>
      <span className="text-sm">{label}</span>
      <span className="truncate text-sm text-muted-foreground">{value}</span>
    </div>
  )
}
