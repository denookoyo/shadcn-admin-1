import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchJson } from '@/lib/http'

type AuthorizeRequestPayload = {
  application: {
    id: string
    name: string
    description?: string | null
    clientId: string
    redirectUris: string[]
    scopes: string[]
  }
  redirectUri: string
  scopes: string[]
  state?: string | null
  loginRequired: boolean
  loggedIn: boolean
  user?: { id: number; email?: string | null; name?: string | null } | null
}

type AuthorizationResponse = {
  redirectTo: string
}

export const Route = createFileRoute('/oauth/authorize')({
  validateSearch: (search: Record<string, unknown>) => ({
    client_id: typeof search.client_id === 'string' ? search.client_id : '',
    redirect_uri: typeof search.redirect_uri === 'string' ? search.redirect_uri : '',
    response_type: typeof search.response_type === 'string' ? search.response_type : 'code',
    scope: typeof search.scope === 'string' ? search.scope : '',
    state: typeof search.state === 'string' ? search.state : '',
  }),
  component: OAuthAuthorizePage,
})

function OAuthAuthorizePage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [payload, setPayload] = useState<AuthorizeRequestPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const currentPath = `${window.location.pathname}${window.location.search}`

    async function load() {
      if (!search.client_id || !search.redirect_uri) {
        if (active) {
          setError('Missing client_id or redirect_uri.')
          setLoading(false)
        }
        return
      }

      try {
        const params = new URLSearchParams({
          client_id: search.client_id,
          redirect_uri: search.redirect_uri,
          response_type: search.response_type || 'code',
        })
        if (search.scope) params.set('scope', search.scope)
        if (search.state) params.set('state', search.state)
        const nextPayload = await fetchJson<AuthorizeRequestPayload>(`/api/oauth/authorize/request?${params.toString()}`)
        if (!active) return
        if (nextPayload.loginRequired) {
          navigate({ to: '/sign-in', search: { redirect: currentPath } })
          return
        }
        setPayload(nextPayload)
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'Unable to load the authorization request.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [navigate, search.client_id, search.redirect_uri, search.response_type, search.scope, search.state])

  async function submitDecision(decision: 'approve' | 'deny') {
    if (!payload) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetchJson<AuthorizationResponse>('/api/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: search.client_id,
          redirect_uri: search.redirect_uri,
          response_type: search.response_type || 'code',
          scope: search.scope,
          state: search.state,
          decision,
        }),
      })
      window.location.assign(response.redirectTo)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to complete the authorization request.')
      setSubmitting(false)
    }
  }

  const redirectHost = formatRedirectHost(payload?.redirectUri || search.redirect_uri)

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,#dcfce7,transparent_42%),linear-gradient(180deg,#f8fafc_0%,#ecfdf5_100%)] px-4 py-10'>
      <div className='mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center'>
        <Card className='w-full rounded-[28px] border-slate-200 bg-white/95 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur'>
          <CardHeader className='space-y-4'>
            <div className='inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
              <KeyRound className='h-3.5 w-3.5' />
              OAuth connection
            </div>
            <CardTitle className='text-2xl font-semibold text-slate-950'>
              {payload?.application.name || 'Marketplace connection request'}
            </CardTitle>
            <CardDescription className='max-w-2xl text-sm text-slate-600'>
              {payload?.application.description || 'This app wants permission to connect to your Marketplace account and use the functions you approve below.'}
            </CardDescription>
          </CardHeader>

          <CardContent className='space-y-6'>
            {loading ? (
              <div className='rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500'>
                Loading authorization request...
              </div>
            ) : null}

            {error ? (
              <div className='rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
                <div className='flex items-center gap-2 font-semibold'>
                  <AlertCircle className='h-4 w-4' />
                  Authorization could not start
                </div>
                <p className='mt-2'>{error}</p>
              </div>
            ) : null}

            {payload ? (
              <>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='rounded-3xl border border-slate-200 bg-slate-50 p-5'>
                    <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Signed in as</div>
                    <div className='mt-2 text-sm font-semibold text-slate-900'>{payload.user?.name || payload.user?.email || 'Marketplace user'}</div>
                    <div className='mt-1 text-xs text-slate-500'>{payload.user?.email || 'No email available'}</div>
                  </div>
                  <div className='rounded-3xl border border-slate-200 bg-slate-50 p-5'>
                    <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Callback destination</div>
                    <div className='mt-2 text-sm font-semibold text-slate-900'>{redirectHost}</div>
                    <div className='mt-1 break-all text-xs text-slate-500'>{payload.redirectUri}</div>
                  </div>
                </div>

                <section className='rounded-3xl border border-slate-200 bg-white p-5'>
                  <div className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
                    <ShieldCheck className='h-4 w-4 text-emerald-600' />
                    Approved scopes
                  </div>
                  <div className='mt-4 grid gap-3 md:grid-cols-2'>
                    {payload.scopes.map((scope) => (
                      <div key={scope} className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'>
                        <div className='font-semibold text-slate-900'>{scope}</div>
                        <div className='mt-1 text-xs text-slate-500'>{scopeCopy[scope] || 'Allows this app to use the related Marketplace API.'}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </CardContent>

          <CardFooter className='flex flex-col items-start gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between'>
            <div className='text-xs text-slate-500'>
              OAuth access is issued to the connected app only after you approve this request. You can revoke tokens later from the app configuration.
            </div>
            <div className='flex w-full flex-col gap-3 sm:w-auto sm:flex-row'>
              <Button variant='outline' className='rounded-full' disabled={loading || submitting || !payload} onClick={() => submitDecision('deny')}>
                Cancel
              </Button>
              <Button className='rounded-full bg-emerald-600 px-6 hover:bg-emerald-500' disabled={loading || submitting || !payload} onClick={() => submitDecision('approve')}>
                <CheckCircle2 className='mr-2 h-4 w-4' />
                {submitting ? 'Connecting...' : 'Allow access'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

function formatRedirectHost(value: string) {
  try {
    const url = new URL(value)
    return url.host
  } catch {
    return value
  }
}

const scopeCopy: Record<string, string> = {
  'products:read': 'Read Marketplace products and inventory metadata.',
  'products:write': 'Create, update, and delete Marketplace products you are allowed to manage.',
  'categories:read': 'Read Marketplace category definitions.',
  'categories:write': 'Create and update Marketplace category definitions.',
  'orders:read': 'Read Marketplace orders connected to your account.',
  'orders:write': 'Create, update, and delete Marketplace orders you are allowed to manage.',
  'sales:read': 'Read sales totals, order counts, and revenue summaries.',
  'refunds:read': 'Read refund requests and refund history.',
  'refunds:write': 'Create and review refund requests.',
  'profile:read': 'Read the connected Marketplace user profile.',
}
