import { createContext, useContext } from 'react'

/** The app's main scrolling element (<main> in AppShell); virtual lists attach to it. */
export const ScrollElementContext = createContext<HTMLElement | null>(null)

export function useScrollElement() {
  return useContext(ScrollElementContext)
}
