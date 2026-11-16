import { createFileRoute } from '@tanstack/react-router'
import { MdSearch } from 'react-icons/md'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/_app/search')({
  staticData: { section: 'search' },
  component: () => <ComingSoon icon={MdSearch} title="Search your library" phase={2} />,
})
