import { useEffect, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

declare global {
  interface Window {
    google?: any
  }
}

export function GoogleSignInButton() {
  const divRef = useRef<HTMLDivElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string | undefined
  const router = useRouter()

  useEffect(() => {
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
          const r = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: resp.credential }),
          })
          if (!r.ok) throw new Error('Sign-in failed')
          const user = await r.json()
          useAuthStore.getState().auth.setUser(user as any)
          // Redirect to requested page or dashboard
          const params = new URL(window.location.href).searchParams
          const redirect = params.get('redirect')
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

  if (!clientId) return null
  return <div ref={divRef} />
}
