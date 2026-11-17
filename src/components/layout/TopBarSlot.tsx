import { type ReactNode, use } from 'react'
import { createPortal } from 'react-dom'
import { TopBarSlotContext } from './topBarSlot'

/**
 * Renders its children inside the sticky top bar, below its main row, so the
 * bar and a page's sub-bar share one translucent, blurred background (two
 * separate blurred bars show a visible seam where they meet).
 */
export function TopBarSlot({ children }: { children: ReactNode }) {
  const slot = use(TopBarSlotContext)
  return slot ? createPortal(children, slot) : null
}
