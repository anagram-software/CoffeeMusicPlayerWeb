import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/library')({
  staticData: { section: 'library' },
  component: LibraryLayout,
})

const tabs = [
  { to: '/library/songs', label: 'Songs' },
  { to: '/library/albums', label: 'Albums' },
  { to: '/library/artists', label: 'Artists' },
  { to: '/library/genres', label: 'Genres' },
] as const

/** Tab strip like the Android library TabLayout: uppercase labels, accent underline. */
function LibraryLayout() {
  return (
    <div className="flex flex-col">
      <nav className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <ul className="flex overflow-x-auto px-2 md:px-4">
          {tabs.map((t) => (
            <li key={t.to}>
              <Link
                to={t.to}
                className="relative block px-4 py-3 text-sm font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase transition-colors hover:text-foreground data-[status=active]:text-section data-[status=active]:after:absolute data-[status=active]:after:inset-x-2 data-[status=active]:after:bottom-0 data-[status=active]:after:h-0.5 data-[status=active]:after:bg-section"
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
