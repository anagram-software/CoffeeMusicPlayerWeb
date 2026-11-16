import { createFileRoute } from '@tanstack/react-router'
import { MdFavorite } from 'react-icons/md'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/_app/favorites')({
  staticData: { section: 'favorites' },
  component: () => <ComingSoon icon={MdFavorite} title="Your starred songs, albums and artists" phase={4} />,
})
