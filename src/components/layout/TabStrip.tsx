import { Link, type LinkProps } from '@tanstack/react-router'

/** Uppercase tabs with an accent underline, like the Android TabLayout. */
export function TabStrip({ tabs }: { tabs: { label: string; link: LinkProps }[] }) {
  return (
    <nav className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <ul className="flex overflow-x-auto px-2 md:px-4">
        {tabs.map((t) => (
          <li key={t.label}>
            <Link
              {...t.link}
              className="relative block px-4 py-3 text-sm font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase transition-colors hover:text-foreground data-[status=active]:text-section data-[status=active]:after:absolute data-[status=active]:after:inset-x-2 data-[status=active]:after:bottom-0 data-[status=active]:after:h-0.5 data-[status=active]:after:bg-section"
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
