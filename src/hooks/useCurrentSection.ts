import { useMatches } from '@tanstack/react-router'
import type { SectionId } from '@/lib/sections'

/** The current page's section, declared via `staticData: { section }` on each route. */
export function useCurrentSection(): SectionId {
  const matches = useMatches()
  for (let i = matches.length - 1; i >= 0; i--) {
    const section = matches[i].staticData.section
    if (section) return section
  }
  return 'home'
}
