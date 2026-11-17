import { Link, type LinkProps } from '@tanstack/react-router'
import { TopBarSlot } from './TopBarSlot'

interface TabStripProps {
  tabs: { label: string; link: LinkProps }[]
  /** Render in place, instead of in the top bar's sub-bar slot (e.g. alongside other slot content). */
  inline?: boolean
}

/** Uppercase tabs with an accent underline, like the Android TabLayout. Shown inside the top bar. */
export function TabStrip({ tabs, inline }: TabStripProps) {
  const nav = (
    <nav className="border-b border-border">
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
  return inline ? nav : <TopBarSlot>{nav}</TopBarSlot>
}
