import { createContext } from 'react'

/** The element under the top bar's main row where pages can put a sub-bar (tabs, search box). */
export const TopBarSlotContext = createContext<HTMLElement | null>(null)
