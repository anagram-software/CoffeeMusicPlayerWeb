import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { useSessionStore } from '@/stores/session'

/** Pathless layout: everything under src/routes/_app/ requires a session. */
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => {
    if (!useSessionStore.getState().session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: AppShell,
})
