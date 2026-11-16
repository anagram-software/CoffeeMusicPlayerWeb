import { createFileRoute } from '@tanstack/react-router'
import { MdHome } from 'react-icons/md'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/_app/')({
  staticData: { section: 'home' },
  component: () => <ComingSoon icon={MdHome} title="Recently added, most played and more" phase={4} />,
})
