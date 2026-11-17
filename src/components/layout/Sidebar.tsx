import { Link } from '@tanstack/react-router'
import { useCurrentSection } from '@/hooks/useCurrentSection'
import { navSections, sections } from '@/lib/sections'

/** Navigation list, used by the desktop sidebar and the mobile drawer. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  // Highlight by section, so e.g. an album page keeps "Library" highlighted.
  const current = useCurrentSection()

  return (
    <nav className="flex h-full flex-col overflow-y-auto">
      {/* Mirrors the Android navigation_header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <img src="/icon.png" alt="" className="size-9" />
        <div className="text-2xl leading-none font-thin tracking-wide">Coffee</div>
      </div>

      <ul className="flex flex-col gap-0.5 px-2">
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
    </nav>
  )
}
