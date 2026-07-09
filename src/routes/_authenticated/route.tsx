import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/authStore'
import { marketplaceConsumerMode } from '@/lib/marketplace-consumer'

const demoUser = {
  id: 0,
  email: 'team@hedgetech.market',
  name: 'Hedgetech Demo Operator',
  image: null,
  role: 'seller',
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const setUser = useAuthStore.getState().auth.setUser
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const user = await res.json()
        if (user) {
          setUser(user)
          return
        }
        throw redirect({ to: '/sign-in', search: { redirect: location.href } })
      }
      if (res.status === 401 || res.status === 403) {
        throw redirect({ to: '/sign-in', search: { redirect: location.href } })
      }
    } catch {
      if (marketplaceConsumerMode) {
        throw redirect({ to: '/sign-in', search: { redirect: location.href } })
      }
      // Network failure or API unavailable – fall back to demo operator
      setUser(demoUser)
      return
    }
    if (marketplaceConsumerMode) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }
    setUser(demoUser)
    return
  },
  component: AuthenticatedLayout,
})
