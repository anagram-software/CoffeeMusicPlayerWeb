import { Navigate, Outlet } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { FullPlayer } from '@/components/player/FullPlayer'
import { SidePanel } from '@/components/player/SidePanel'
import { SIDE_PANEL_WIDTH } from '@/components/player/sidePanelState'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { usePlayerShortcuts } from '@/hooks/usePlayerShortcuts'
import { useCurrentSection } from '@/hooks/useCurrentSection'
import { sections } from '@/lib/sections'
import { initPlayer } from '@/player/engine'
import { usePlayerStore } from '@/player/store'
import { useSessionStore } from '@/stores/session'
import { PlayerBar } from './PlayerBar'
import { ScrollElementContext } from './scrollElement'
import { TopBarSlotContext } from './topBarSlot'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  const section = useCurrentSection()
  const hasSession = useSessionStore((s) => !!s.session)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null)
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null)
  const fullPlayerOpen = usePlayerStore((s) => s.fullPlayerOpen)
  const panelOpen = usePlayerStore((s) => !!s.panel)
  // Queue/lyrics panel: a docked column on wide screens, a slide-over sheet below that.
  const wide = useMediaQuery('(min-width: 1024px)')
  const mobile = !useMediaQuery('(min-width: 768px)')
  const docked = wide && panelOpen

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
    <div
      className={cn(
        'grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[1fr_auto] md:grid-cols-[15rem_minmax(0,1fr)]',
        docked && 'md:grid-cols-[15rem_minmax(0,1fr)_var(--side-panel-width)]',
      )}
      style={{ '--side-panel-width': SIDE_PANEL_WIDTH } as React.CSSProperties}
    >
      {/* Columns are minmax(0, …): an "auto"/"1fr" track grows to fit its widest
          unbreakable content (a long title), stretching the whole app past the screen. */}
      <aside className="hidden min-h-0 border-r border-sidebar-border bg-sidebar md:block">
        <Sidebar />
      </aside>

      {/* One scroll container for the top bar and the page, so content scrolls under the translucent top bar. */}
      <div ref={setScrollEl} data-scroll-restoration-id="main" className="min-h-0 min-w-0 overflow-y-auto">
        <TopBar section={section} drawerOpen={drawerOpen} onDrawerOpenChange={setDrawerOpen} onSlotRef={setSlotEl} />
        <ScrollElementContext value={scrollEl}>
          <TopBarSlotContext value={slotEl}>
            {/* Stable element: virtual lists watch it to detect content resizes. */}
            <main data-scroll-content>
              <Outlet />
            </main>
          </TopBarSlotContext>
        </ScrollElementContext>
      </div>

      {docked && <SidePanel className="min-h-0 border-l border-sidebar-border bg-sidebar" />}

      <div className="col-span-full">
        <PlayerBar />
      </div>

      {/* Tablet widths: the same panel as a slide-over sheet. Mobile shows it inside the full player instead. */}
      <Sheet open={panelOpen && !wide && !mobile} onOpenChange={(open) => !open && usePlayerStore.setState({ panel: null })}>
        <SheetContent side="right" showCloseButton={false} className="w-[min(24rem,100vw)] gap-0 bg-sidebar p-0 sm:max-w-none">
          <SheetTitle className="sr-only">Queue and lyrics</SheetTitle>
          <SidePanel className="h-full" />
        </SheetContent>
      </Sheet>

      <AnimatePresence>{fullPlayerOpen && <FullPlayer />}</AnimatePresence>
      <SettingsDialog />
    </div>
  )
}
