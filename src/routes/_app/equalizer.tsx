import { createFileRoute } from '@tanstack/react-router'
import { MdEqualizer } from 'react-icons/md'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/_app/equalizer')({
  staticData: { section: 'equalizer' },
  component: () => <ComingSoon icon={MdEqualizer} title="5-band equalizer, bass boost and virtualizer" phase={5} />,
})
