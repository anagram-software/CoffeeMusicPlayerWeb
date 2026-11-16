import { createFileRoute } from '@tanstack/react-router'
import { MdLibraryMusic } from 'react-icons/md'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/_app/library')({
  staticData: { section: 'library' },
  component: () => <ComingSoon icon={MdLibraryMusic} title="Songs, albums, artists, folders and genres" phase={2} />,
})
