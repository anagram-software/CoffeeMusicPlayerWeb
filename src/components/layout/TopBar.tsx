import { Link } from '@tanstack/react-router'
import { MdMenu, MdSearch } from 'react-icons/md'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { type SectionId, sections } from '@/lib/sections'
import { Sidebar } from './Sidebar'

interface TopBarProps {
  section: SectionId
  drawerOpen: boolean
  onDrawerOpenChange: (open: boolean) => void
}

export function TopBar({ section, drawerOpen, onDrawerOpenChange }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-2 md:px-6">
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
    </header>
  )
}
