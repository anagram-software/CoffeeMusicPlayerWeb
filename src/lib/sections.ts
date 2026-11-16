import type { IconType } from 'react-icons'
import {
  MdEqualizer,
  MdFavorite,
  MdHome,
  MdLibraryMusic,
  MdQueueMusic,
  MdSearch,
  MdSettings,
} from 'react-icons/md'

/**
 * App sections, mirroring the Android navigation drawer. `id` matches the
 * `data-section` accent rules in index.css.
 */
export const sections = {
  home: { id: 'home', label: 'Home', to: '/', icon: MdHome },
  favorites: { id: 'favorites', label: 'Favorites', to: '/favorites', icon: MdFavorite },
  library: { id: 'library', label: 'Library', to: '/library', icon: MdLibraryMusic },
  playlists: { id: 'playlists', label: 'Playlists', to: '/playlists', icon: MdQueueMusic },
  equalizer: { id: 'equalizer', label: 'Equalizer', to: '/equalizer', icon: MdEqualizer },
  settings: { id: 'settings', label: 'Settings', to: '/settings', icon: MdSettings },
  search: { id: 'search', label: 'Search', to: '/search', icon: MdSearch },
} as const satisfies Record<string, { id: string; label: string; to: string; icon: IconType }>

export type SectionId = keyof typeof sections

/** Order shown in the sidebar / drawer. */
export const navSections: SectionId[] = ['home', 'favorites', 'library', 'playlists', 'equalizer', 'settings']
