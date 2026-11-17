import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useApplyTheme, useResolvedTheme } from '@/hooks/useTheme'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
})

function RootLayout() {
  // At the root so the login page follows the theme too.
  useApplyTheme()
  const theme = useResolvedTheme()
  return (
    <TooltipProvider>
      <Outlet />
      <Toaster position="bottom-center" theme={theme} />
      {import.meta.env.DEV && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackRouterDevtools position="bottom-left" toggleButtonProps={{ style: { bottom: 64 } }} />
        </>
      )}
    </TooltipProvider>
  )
}
