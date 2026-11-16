import { createFileRoute, redirect } from '@tanstack/react-router'

// The Android app has a "Start Library with" setting; Albums for now.
export const Route = createFileRoute('/_app/library/')({
  beforeLoad: () => {
    throw redirect({ to: '/library/albums', replace: true })
  },
})
