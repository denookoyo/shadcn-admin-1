import { useEffect, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import {
  buildGangLedgerSignInUrl,
  marketplaceConsumerMode,
  normalizeMarketplaceRedirectTarget,
} from '@/lib/marketplace-consumer'

declare global {
  interface Window {
    google?: any
  }
}

export function GoogleSignInButton() {
  const divRef = useRef<HTMLDivElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const router = useRouter()
  const redirect =
    typeof window === 'undefined'
      ? '/'
      : normalizeMarketplaceRedirectTarget(new URL(window.location.href).searchParams.get('redirect'))

  useEffect(() => {
    if (marketplaceConsumerMode) return
    if (!clientId) return
    const existing = document.getElementById('google-client-script') as HTMLScriptElement | null
    if (existing) {
      onScriptLoad()
      return
    }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.id = 'google-client-script'
    s.onload = onScriptLoad
    document.head.appendChild(s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  function onScriptLoad() {
    if (!window.google || loaded) return
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp: any) => {
        try {
          const r: Response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: resp.credential }),
          })
          if (!r.ok) throw new Error('Sign-in failed')
          const data: any = await r.json()
          if (data?.mfaRequired) {
            router.navigate({ to: '/(auth)/otp' as any })
            return
          }
          useAuthStore.getState().auth.setUser(data as any)
          // Redirect to requested page or dashboard
          const params = new URL(window.location.href).searchParams
          const redirect = normalizeMarketplaceRedirectTarget(params.get('redirect'))
          if (redirect && redirect.startsWith('/')) {
            router.navigate({ to: redirect as any })
          } else {
            router.navigate({ to: '/' })
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e)
        }
      },
    })
    if (divRef.current) {
      window.google.accounts.id.renderButton(divRef.current, { theme: 'outline', size: 'large', width: '100%' })
      setLoaded(true)
    }
  }

  if (marketplaceConsumerMode) {
    return (
      <a
        href={buildGangLedgerSignInUrl(redirect)}
        className='inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800'
      >
        Continue with Gang Ledger
      </a>
    )
  }

  if (!clientId) return <div className='text-sm text-red-600'>Missing VITE_GOOGLE_CLIENT_ID</div>
  return <div ref={divRef} />
}
