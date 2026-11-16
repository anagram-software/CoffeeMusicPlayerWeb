import { createFileRoute } from '@tanstack/react-router'
import { MdQueueMusic } from 'react-icons/md'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/_app/playlists')({
  staticData: { section: 'playlists' },
  component: () => <ComingSoon icon={MdQueueMusic} title="Your playlists" phase={4} />,
})
