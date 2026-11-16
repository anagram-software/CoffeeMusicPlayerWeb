import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { SubsonicError } from '@/lib/subsonic/client'
import { useSessionStore } from '@/stores/session'

// If the server starts rejecting our credentials (password changed, user
// removed), drop the session. AppShell then redirects to /login.
function onError(error: Error) {
  if (error instanceof SubsonicError && error.isAuthError) useSessionStore.getState().logout()
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (count, error) => !(error instanceof SubsonicError && error.isAuthError) && count < 2,
    },
  },
})

// Never show one account's cached library to the next one.
useSessionStore.subscribe((state, prev) => {
  if (prev.session && !state.session) queryClient.clear()
})
