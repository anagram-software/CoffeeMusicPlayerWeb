import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SubsonicError } from '@/lib/subsonic/client'
import { useSessionStore } from '@/stores/session'
import { routeTree } from './routeTree.gen'
import './index.css'

// If the server starts rejecting our credentials (password changed, user
// removed), drop the session; the _app layout will redirect to /login.
function onError(error: Error) {
  if (error instanceof SubsonicError && error.isAuthError) {
    useSessionStore.getState().logout()
    router.navigate({ to: '/login' })
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (count, error) => !(error instanceof SubsonicError && error.isAuthError) && count < 2,
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Let TanStack Query decide freshness instead of the router cache.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
  interface StaticDataRouteOption {
    /** Which section's accent colour / title the page uses. */
    section?: import('@/lib/sections').SectionId
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
