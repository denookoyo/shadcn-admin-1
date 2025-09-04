'use client'

import { StrictMode, useEffect } from 'react'
import { AxiosError } from 'axios'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { handleServerError } from '@/utils/handle-server-error'
import { FontProvider } from './context/font-context'
import { ThemeProvider } from './context/theme-context'
import { routeTree } from './routeTree.gen'

export function AppShell() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (failureCount >= 0 && process.env.NODE_ENV !== 'production') return false
          if (failureCount > 3 && process.env.NODE_ENV === 'production') return false
          return !(error instanceof AxiosError && [401, 403].includes(error.response?.status ?? 0))
        },
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
        staleTime: 10 * 1000,
      },
      mutations: {
        onError: (error) => {
          handleServerError(error)
          if (error instanceof AxiosError) {
            if (error.response?.status === 304) toast.error('Content not modified!')
          }
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof AxiosError) {
          if (error.response?.status === 401) {
            toast.error('Session expired!')
            useAuthStore.getState().auth.reset()
          }
          if (error.response?.status === 500) toast.error('Internal Server Error!')
        }
      },
    }),
  })

  const router = createRouter({ routeTree, context: { queryClient }, defaultPreload: 'intent', defaultPreloadStaleTime: 0 })

  // Warm auth state from server session cookie
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (user) useAuthStore.getState().auth.setUser(user)
      })
      .catch(() => {})
  }, [])

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <FontProvider>
            <RouterProvider router={router} />
          </FontProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

