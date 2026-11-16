import { createFileRoute, Outlet } from '@tanstack/react-router'
import { TabStrip } from '@/components/layout/TabStrip'

export const Route = createFileRoute('/_app/library')({
  staticData: { section: 'library' },
  component: LibraryLayout,
})

function LibraryLayout() {
  return (
    <div className="flex flex-col">
      <TabStrip
        tabs={[
          { label: 'Songs', link: { to: '/library/songs' } },
          { label: 'Albums', link: { to: '/library/albums' } },
          { label: 'Artists', link: { to: '/library/artists' } },
          { label: 'Genres', link: { to: '/library/genres' } },
        ]}
      />
      <Outlet />
    </div>
  )
}
