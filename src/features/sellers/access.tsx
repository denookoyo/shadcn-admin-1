import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, redirect } from '@tanstack/react-router'
import { ShieldAlert, Clock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'
import { useAuthStore } from '@/stores/authStore'
import { getSellerStatus, SELLER_VERIFICATION_EVENT, type SellerVerificationStatus } from '@/features/sellers/verification'

type SellerAccessState = {
  user: any | null
  sellerStatus: SellerVerificationStatus
  isAdmin: boolean
  canAccessSellerTools: boolean
}

function computeSellerAccess(user: any | null): SellerAccessState {
  const email = user?.email as string | undefined
  const role = String(user?.role ?? '').toLowerCase()
  const explicitAdmin = Boolean(user?.isAdmin)
  const roleAdmin = ['admin', 'manager', 'superadmin'].includes(role)
  const sellerStatus = getSellerStatus(email)
  const isAdmin = explicitAdmin || roleAdmin
  const canAccessSellerTools = isAdmin || sellerStatus === 'approved'
  return { user, sellerStatus, isAdmin, canAccessSellerTools }
}

export function getSellerAccessState(): SellerAccessState {
  const state = useAuthStore.getState()
  return computeSellerAccess(state.auth.user)
}

export async function ensureSellerRouteAccess(location?: { href?: string; pathname?: string }) {
  let access = getSellerAccessState()
  if (!access.user && typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const user = res.ok ? await res.json() : null
      if (user) useAuthStore.getState().auth.setUser(user)
      access = computeSellerAccess(user)
    } catch {
      // ignore
    }
  }
  if (!access.canAccessSellerTools) {
    const redirectTarget = location?.href || location?.pathname || '/marketplace/dashboard'
    throw redirect({ to: '/marketplace/dashboard/verification', search: { redirect: redirectTarget } })
  }
  return access
}

export function useSellerAccess() {
  const { user } = useAuthStore((s) => s.auth)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => setVersion((prev) => prev + 1)
    window.addEventListener(SELLER_VERIFICATION_EVENT, handler)
    return () => window.removeEventListener(SELLER_VERIFICATION_EVENT, handler)
  }, [])

  const { sellerStatus, isAdmin, canAccessSellerTools } = useMemo(
    () => computeSellerAccess(user),
    [user, version],
  )

  return { user, sellerStatus, isAdmin, canAccessSellerTools }
}

const statusCopy: Record<
  SellerVerificationStatus,
  { badge: string; heading: string; description: string; cta: string; tone: 'amber' | 'sky' | 'red' }
> = {
  not_submitted: {
    badge: 'Buyer profile',
    heading: 'Become a Hedgetech seller',
    description: 'Access to seller cockpit, POS, and land intake is limited to verified seller teams. Submit your company profile so operations can approve your workspace.',
    cta: 'Become a seller',
    tone: 'amber',
  },
  pending: {
    badge: 'In review',
    heading: 'Seller application under review',
    description: 'Support is reviewing your compliance pack. You can still update documents or contact operations while we finish checks.',
    cta: 'View submission',
    tone: 'sky',
  },
  rejected: {
    badge: 'Needs updates',
    heading: 'Verification needs more information',
    description: 'Your last submission requires updates before we can unlock seller tooling. Refresh your documents or contact support for guidance.',
    cta: 'Update submission',
    tone: 'red',
  },
  approved: {
    badge: 'Approved',
    heading: 'Seller access approved',
    description: 'You can access seller tooling.',
    cta: 'Open seller cockpit',
    tone: 'amber',
  },
}

const toneClasses: Record<typeof statusCopy[keyof typeof statusCopy]['tone'], { badge: string; pill: string }> = {
  amber: { badge: 'text-amber-900 bg-amber-50 border border-amber-200', pill: 'bg-amber-600 text-white' },
  sky: { badge: 'text-sky-900 bg-sky-50 border border-sky-200', pill: 'bg-sky-600 text-white' },
  red: { badge: 'text-red-900 bg-red-50 border border-red-200', pill: 'bg-red-600 text-white' },
}

const steps = [
  { label: 'Become a seller', description: 'Share company, contacts, and compliance pack.' },
  { label: 'Ops verification', description: 'Support reviews docs and schedules onboarding.' },
  { label: 'Start selling', description: 'Cockpit, POS, and land marketplace unlock automatically.' },
]

export function SellerAccessNotice({
  feature = 'seller tooling',
  sellerStatus,
  isSignedIn,
}: {
  feature?: string
  sellerStatus: SellerVerificationStatus
  isSignedIn: boolean
}) {
  const location = useLocation()
  const redirect = location.href || location.pathname || '/marketplace/dashboard'
  const config = statusCopy[sellerStatus] ?? statusCopy.not_submitted
  const tone = toneClasses[config.tone]
  const activeStep = sellerStatus === 'pending' ? 1 : sellerStatus === 'rejected' ? 0 : 0

  return (
    <MarketplacePageShell width='default' className='space-y-10' topSpacing='lg' bottomSpacing='lg'>
      <section className='rounded-4xl border border-slate-200 bg-white p-8 shadow-sm'>
        <div className='inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide'>
          <ShieldAlert className='h-3.5 w-3.5 text-amber-600' />
          Seller access required
        </div>
        <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
          {config.badge}
        </div>
        <h1 className='mt-4 text-3xl font-semibold text-slate-900'>{config.heading}</h1>
        <p className='mt-2 text-sm text-slate-600'>
          You are currently browsing as a buyer. {config.description} Once approved, you can open {feature} without restrictions.
        </p>
        <div className='mt-6 flex flex-wrap gap-3'>
          {isSignedIn ? (
            <Button asChild className={`rounded-full ${tone.pill}`}>
              <Link to='/marketplace/dashboard/verification'>{config.cta}</Link>
            </Button>
          ) : (
            <Button asChild className='rounded-full bg-emerald-600 text-white hover:bg-emerald-500'>
              <Link to='/sign-in' search={{ redirect }}>
                Sign in to apply
              </Link>
            </Button>
          )}
          <Button asChild variant='outline' className='rounded-full'>
            <Link to='/marketplace/dashboard/support'>Contact support</Link>
          </Button>
        </div>
        <div className='mt-6 flex flex-wrap gap-4 rounded-3xl border border-dashed border-slate-200 p-4 text-xs text-slate-500'>
          <div className='flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700'>
            <Clock className='h-3.5 w-3.5' /> Current status: {config.badge}
          </div>
          <span>Verification must be approved before seller cockpit, POS, payouts, and land posting unlock.</span>
        </div>
      </section>

      <section className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
        <h2 className='text-sm font-semibold uppercase tracking-wide text-slate-500'>How verification works</h2>
        <div className='mt-4 grid gap-4 md:grid-cols-3'>
          {steps.map((step, index) => (
            <div
              key={step.label}
              className={`rounded-2xl border p-4 ${
                index < activeStep ? 'border-emerald-200 bg-emerald-50/60' : index === activeStep ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-white'
              }`}
            >
              <div className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
                {index === 2 ? <ShieldCheck className='h-4 w-4 text-emerald-600' /> : <Clock className='h-4 w-4 text-slate-400' />}
                {step.label}
              </div>
              <p className='mt-2 text-xs text-slate-600'>{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketplacePageShell>
  )
}
