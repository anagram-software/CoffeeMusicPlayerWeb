import { Navigate, Outlet } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { FullPlayer } from '@/components/player/FullPlayer'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { usePlayerShortcuts } from '@/hooks/usePlayerShortcuts'
import { useCurrentSection } from '@/hooks/useCurrentSection'
import { sections } from '@/lib/sections'
import { initPlayer } from '@/player/engine'
import { usePlayerStore } from '@/player/store'
import { useSessionStore } from '@/stores/session'
import { PlayerBar } from './PlayerBar'
import { ScrollElementContext } from './scrollElement'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  const section = useCurrentSection()
  const hasSession = useSessionStore((s) => !!s.session)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null)
  const fullPlayerOpen = usePlayerStore((s) => s.fullPlayerOpen)

  // The engine needs the session for stream URLs, so it starts here, not at app load.
  useEffect(() => {
    if (hasSession) initPlayer()
  }, [hasSession])
  usePlayerShortcuts()

  // Set on <html> (not a wrapper div) so portaled UI like dialogs, sheets
  // and toasts also picks up the section accent.
  useEffect(() => {
    document.documentElement.dataset.section = section
    document.title = `${sections[section].label} · Coffee`
  }, [section])

  // Signed out (manually, or because the server rejected our token).
  if (!hasSession) return <Navigate to="/login" />

  return (
    <div className="grid h-dvh grid-rows-[1fr_auto] md:grid-cols-[15rem_1fr]">
      <aside className="hidden min-h-0 border-r border-sidebar-border bg-sidebar md:block">
        <Sidebar />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        <TopBar section={section} drawerOpen={drawerOpen} onDrawerOpenChange={setDrawerOpen} />
        <main ref={setScrollEl} data-scroll-restoration-id="main" className="min-h-0 flex-1 overflow-y-auto">
          <ScrollElementContext value={scrollEl}>
            {/* Stable wrapper: virtual lists watch it to detect content resizes. */}
            <div className="min-h-full">
              <Outlet />
            </div>
          </ScrollElementContext>
        </main>
      </div>

      <div className="md:col-span-2">
        <PlayerBar />
      </div>

      <AnimatePresence>{fullPlayerOpen && <FullPlayer />}</AnimatePresence>
      <SettingsDialog />
    </div>
  )
}
