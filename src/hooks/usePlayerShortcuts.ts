import { useEffect } from 'react'
import { player } from '@/player/engine'

/**
 * Space toggles play/pause anywhere except text fields and controls that use
 * Space themselves. On a focused button it also stops Space from "clicking"
 * it (e.g. pressing Space after clicking Play would otherwise restart the album).
 */
export function usePlayerShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="switch"], [role="menu"], [role="listbox"], [role="dialog"]:not([aria-label="Now playing"])')) return
      e.preventDefault()
      player.togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
