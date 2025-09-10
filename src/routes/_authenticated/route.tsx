import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const user = res.ok ? await res.json() : null
      if (user) {
        useAuthStore.getState().auth.setUser(user)
        return
      }
    } catch {}
    throw redirect({ to: '/sign-in', search: { redirect: location.href } })
  },
  component: AuthenticatedLayout,
})
