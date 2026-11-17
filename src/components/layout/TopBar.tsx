import { Link } from '@tanstack/react-router'
import { MdMenu, MdSearch, MdSettings } from 'react-icons/md'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { type SectionId, sections } from '@/lib/sections'
import { openSettings } from '@/stores/ui'
import { Sidebar } from './Sidebar'

interface TopBarProps {
  /** Receives the sub-bar slot element (provided to pages via TopBarSlotContext). */
  onSlotRef: (el: HTMLDivElement | null) => void
  section: SectionId
  drawerOpen: boolean
  onDrawerOpenChange: (open: boolean) => void
}

export function TopBar({ section, drawerOpen, onDrawerOpenChange, onSlotRef }: TopBarProps) {
  return (
    // One frosted plane: the main row plus a slot for the page's sub-bar (see TopBarSlot).
    <div className="sticky top-0 z-20 bg-background/90 backdrop-blur">
      <header className="flex h-14 items-center gap-2 px-2 md:px-6">
        {/* Mobile: hamburger + drawer, like the Android app */}
        <Button variant="ghost" size="icon-lg" className="md:hidden" onClick={() => onDrawerOpenChange(true)} aria-label="Open menu">
          <MdMenu className="size-6" />
        </Button>
        <Sheet open={drawerOpen} onOpenChange={onDrawerOpenChange}>
          <SheetContent side="left" className="w-72 bg-sidebar p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar onNavigate={() => onDrawerOpenChange(false)} />
          </SheetContent>
        </Sheet>

        {/* The coloured section pill from the Android toolbar */}
        <span className="rounded-md bg-section px-2.5 py-1 text-sm font-medium tracking-wide text-section-foreground uppercase">
          {sections[section].label}
        </span>

        <div className="flex-1" />

        {section !== 'search' && (
          <Button variant="ghost" size="icon-lg" asChild>
            <Link to="/search" aria-label="Search">
              <MdSearch className="size-6" />
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="icon-lg" onClick={() => openSettings()} aria-label="Settings">
          <MdSettings className="size-6" />
        </Button>
      </header>
      <div ref={onSlotRef} />
    </div>
  )
}
