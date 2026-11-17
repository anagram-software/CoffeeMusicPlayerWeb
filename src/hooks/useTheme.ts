import { useEffect } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSettingsStore } from '@/stores/settings'

/** The theme actually in use: the setting, or the device's preference when set to "System". */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useSettingsStore((s) => s.theme)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
}

/**
 * Applies the theme to <html> (the `dark` class switches the palette in
 * index.css). Follows device changes live when set to "System". index.html
 * applies the saved theme before first paint, so there's no flash on load.
 */
export function useApplyTheme() {
  const theme = useResolvedTheme()
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme // native scrollbars, form controls
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#181818' : '#fafafa')
  }, [theme])
}
