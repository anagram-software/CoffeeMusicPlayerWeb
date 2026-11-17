import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { queryClient } from '@/lib/queryClient'
import { routeTree } from './routeTree.gen'
import './index.css'

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Let TanStack Query decide freshness instead of the router cache.
  defaultPreloadStaleTime: 0,
  // Back/forward restores each page's scroll position; any other navigation starts at the
  // top. Our content scrolls in AppShell's container, not the window, so list it too
  // (otherwise its scroll position carries over to the next page).
  scrollRestoration: true,
  scrollToTopSelectors: ['window', '[data-scroll-restoration-id="main"]'],
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
