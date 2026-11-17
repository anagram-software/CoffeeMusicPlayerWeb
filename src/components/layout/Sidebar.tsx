import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CoverArt } from '@/components/CoverArt'
import { PlaylistPlayMenu } from '@/components/library/PlaylistPlayMenu'
import { useCurrentSection } from '@/hooks/useCurrentSection'
import { navSections, sections } from '@/lib/sections'
import { type PlaylistInfo, playlistsQuery } from '@/lib/subsonic/queries'
import { useSubsonic } from '@/stores/session'

/** Navigation list, used by the desktop sidebar and the mobile drawer. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  // Highlight by section, so e.g. an album page keeps "Library" highlighted.
  const current = useCurrentSection()

  return (
    <nav className="flex h-full flex-col">
      {/* Mirrors the Android navigation_header */}
      <div className="flex shrink-0 items-center gap-3 px-5 pt-6 pb-5">
        <img src="/icon.png" alt="" className="size-9" />
        <div className="text-2xl leading-none font-thin tracking-wide">Coffee</div>
      </div>

      <ul className="flex shrink-0 flex-col gap-0.5 px-2">
        {navSections.map((id) => {
          const { label, to, icon: Icon } = sections[id]
          return (
            // Each item carries its own section, so its accent colour is its own.
            <li key={id} data-section={id}>
              <Link
                to={to}
                onClick={onNavigate}
                data-active={current === id || undefined}
                className="group flex items-center gap-4 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground data-active:bg-section/12 data-active:text-foreground"
              >
                <Icon className="size-5 shrink-0 transition-colors group-data-active:text-section" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>

      <SidebarPlaylists onNavigate={onNavigate} />
    </nav>
  )
}

/** The user's playlists, below the main navigation, for one-click access. */
function SidebarPlaylists({ onNavigate }: { onNavigate?: () => void }) {
  const { data: playlists } = useQuery(playlistsQuery(useSubsonic()))
  if (!playlists?.length) return null
  const sorted = [...playlists].sort((a, b) => a.name.localeCompare(b.name))

  return (
    // Only this list scrolls; the logo and main links stay put.
    <section data-section="playlists" className="mt-4 flex min-h-0 flex-1 flex-col border-t border-sidebar-border pt-4">
      <h2 className="mb-1 shrink-0 px-5 text-xs font-medium tracking-wider text-muted-foreground uppercase">Playlists</h2>
      <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-4 [scrollbar-width:thin]">
        {sorted.map((p) => (
          <SidebarPlaylist key={p.id} playlist={p} onNavigate={onNavigate} />
        ))}
      </ul>
    </section>
  )
}

function SidebarPlaylist({ playlist, onNavigate }: { playlist: PlaylistInfo; onNavigate?: () => void }) {
  return (
    <li className="group/item relative">
      {/* The "Playlists" link above stays highlighted for the section; this marks which playlist. */}
      <Link
        to="/playlist/$id"
        params={{ id: playlist.id }}
        onClick={onNavigate}
        title={playlist.name}
        className="flex items-center gap-3 rounded-lg py-1.5 pr-9 pl-3 text-sm text-muted-foreground transition-colors group-hover/item:bg-sidebar-accent group-hover/item:text-foreground data-[status=active]:text-section"
      >
        <CoverArt id={playlist.coverArt} size={64} className="size-8 shrink-0 rounded" />
        <span className="truncate">{playlist.name}</span>
      </Link>
      <PlaylistPlayMenu
        playlist={playlist}
        side="right"
        align="start"
        className="absolute top-1/2 right-1.5 size-7 -translate-y-1/2 text-muted-foreground opacity-0 group-hover/item:opacity-100 hover:bg-white/10 hover:text-foreground focus-visible:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
      />
    </li>
  )
}
