import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Star, ShieldCheck, MessageCircle } from 'lucide-react'
import { db } from '@/lib/data'
import { imageFor } from '@/features/marketplace/helpers'

type ReviewBundle = {
  avg: number
  count: number
  histogram: Record<number, number>
  reviews: {
    orderId: string
    rating: number
    feedback: string
    createdAt: string
    buyer?: { id: number; name?: string | null; email: string; image?: string | null }
  }[]
}

function Histogram({ histogram, count }: { histogram: Record<number, number>; count: number }) {
  return (
    <div className='space-y-2'>
      {[5, 4, 3, 2, 1].map((star) => {
        const value = histogram?.[star as 1 | 2 | 3 | 4 | 5] || 0
        const pct = count ? Math.round((value / count) * 100) : 0
        return (
          <div key={star} className='flex items-center gap-3 text-xs text-slate-500'>
            <span className='w-10 text-right font-semibold text-slate-600'>{star}★</span>
            <div className='h-2 flex-1 rounded-full bg-slate-200'>
              <div className='h-2 rounded-full bg-emerald-500' style={{ width: `${pct}%` }} />
            </div>
            <span className='w-8 text-right'>{value}</span>
          </div>
        )
      })}
    </div>
  )
}

function ReviewCard({ review }: { review: ReviewBundle['reviews'][number] }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
      <div className='flex items-center justify-between text-xs text-slate-500'>
        <div className='flex items-center gap-2'>
          {review.buyer?.image ? (
            <img src={review.buyer.image} className='h-6 w-6 rounded-full object-cover' alt={review.buyer?.name || review.buyer?.email} />
          ) : null}
          <span>{review.buyer?.name || review.buyer?.email || `Buyer #${review.buyer?.id ?? ''}`}</span>
        </div>
        <span>{new Date(review.createdAt).toLocaleDateString()}</span>
      </div>
      <div className='mt-2 text-sm font-semibold text-emerald-700'>
        {Array.from({ length: review.rating }).map((_, idx) => (
          <Star key={idx} className='inline h-4 w-4 fill-emerald-500 text-emerald-500' />
        ))}
      </div>
      <p className='mt-2 text-sm text-slate-600'>{review.feedback}</p>
    </div>
  )
}

function MerchantPage() {
  const { id } = useParams({ from: '/marketplace/_layout/merchant/$id/' })
  const sellerId = Number(id)
  const [user, setUser] = useState<any | null>(null)
  const [reviews, setReviews] = useState<ReviewBundle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [profile, bundle] = await Promise.all([
          db.getUserById?.(sellerId) ?? Promise.resolve(null),
          db.listSellerReviews?.(sellerId) ?? Promise.resolve(null as any),
        ])
        if (!mounted) return
        setUser(profile)
        setReviews(bundle)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [sellerId])

  const avgText = useMemo(() => (reviews?.avg ? reviews.avg.toFixed(1) : '—'), [reviews?.avg])

  if (!Number.isFinite(sellerId)) return <div className='mx-auto max-w-5xl px-4 py-12 text-sm text-red-600'>Invalid seller id.</div>
  if (loading) return <div className='mx-auto max-w-5xl px-4 py-12 text-sm text-slate-500'>Loading merchant…</div>
  if (!user) return <div className='mx-auto max-w-5xl px-4 py-12 text-sm text-slate-500'>Merchant not found.</div>

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Merchant')
  const avatar = user?.image || imageFor(displayName, 200, 200)
  const rating = (user as any)?.rating ?? reviews?.avg ?? 0

  return (
    <div className='mx-auto max-w-5xl space-y-10 px-4 py-10'>
      <div className='flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500'>
        <Link to='/marketplace/listings' className='font-medium text-emerald-700 hover:underline'>← Back to listings</Link>
        <span>Seller ID: {sellerId}</span>
      </div>

      <section className='grid gap-8 rounded-3xl border border-emerald-100/60 bg-emerald-50/60 p-6 shadow-sm md:grid-cols-[1.1fr_1fr]'>
        <div className='flex items-start gap-4'>
          <img src={avatar} alt={displayName} className='h-24 w-24 rounded-3xl border border-emerald-200 object-cover shadow-sm' />
          <div className='space-y-3'>
            <div>
              <span className='inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>Verified seller</span>
              <h1 className='mt-3 text-2xl font-semibold text-slate-900'>{displayName}</h1>
              <p className='text-sm text-slate-600'>{user?.bio || 'Trusted Hedgetech merchant delivering premium goods and services with SLA-backed fulfilment.'}</p>
            </div>
            <div className='flex flex-wrap items-center gap-4 text-xs text-slate-600'>
              <span className='inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-3 py-1 font-semibold text-emerald-800'>★ {Number(rating).toFixed(1)}</span>
              <span>{reviews?.count ?? 0} review{(reviews?.count ?? 0) === 1 ? '' : 's'}</span>
              <span>{(user as any)?.location || 'Location pending'}</span>
            </div>
            <div className='flex flex-wrap gap-3 text-xs'>
              <Badge>On Hedgetech since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '—'}</Badge>
              <Badge>{(user as any)?.responseTime ?? 'Under 2h response'}</Badge>
              <Badge>Repeat buyers {(user as any)?.repeatBuyerRate ?? '62%'}</Badge>
            </div>
          </div>
        </div>
        <div className='rounded-3xl border border-white/60 bg-white/80 p-5 text-sm text-slate-700 shadow-sm backdrop-blur'>
          <h2 className='text-base font-semibold text-slate-900'>Partner highlights</h2>
          <ul className='mt-3 space-y-2 text-xs'>
            <li className='flex items-center gap-2'><ShieldCheck className='h-4 w-4 text-emerald-600' /> Identity & compliance verified</li>
            <li className='flex items-center gap-2'><MessageCircle className='h-4 w-4 text-emerald-600' /> Average response under {(user as any)?.responseTime ?? '2 hours'}</li>
            <li className='flex items-center gap-2'><Star className='h-4 w-4 text-emerald-600' /> {reviews?.count ?? 0} verified reviews</li>
          </ul>
          <div className='mt-5 flex flex-wrap gap-2'>
            <Link
              to='/marketplace/merchant/$id'
              params={{ id: String(sellerId) }}
              className='inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500'
            >
              View storefront
            </Link>
            <Link
              to='/chats'
              className='inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50'
            >
              <MessageCircle className='h-3.5 w-3.5' /> Message seller
            </Link>
          </div>
        </div>
      </section>

      <section className='grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_1.1fr]'>
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold text-slate-900'>Rating distribution</h2>
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
            <div className='flex items-end gap-3'>
              <span className='text-4xl font-semibold text-emerald-700'>{avgText}</span>
              <span className='text-sm text-slate-500'>Average rating across {reviews?.count ?? 0} orders</span>
            </div>
            <div className='mt-4'>
              <Histogram histogram={reviews?.histogram || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }} count={reviews?.count || 0} />
            </div>
          </div>
        </div>
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold text-slate-900'>Latest reviews</h2>
          <div className='grid gap-3 max-h-[420px] overflow-auto pr-1 text-sm text-slate-600'>
            {reviews?.reviews?.length ? (
              reviews.reviews.map((review) => <ReviewCard key={review.orderId} review={review} />)
            ) : (
              <div className='rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500'>No reviews yet. Encourage buyers to leave feedback to build trust.</div>
            )}
          </div>
        </div>
      </section>

      <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
        <h2 className='text-lg font-semibold text-slate-900'>Merchant details</h2>
        <div className='mt-4 grid gap-4 sm:grid-cols-2 text-sm text-slate-600'>
          <div>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Name</div>
            <div className='mt-1 text-slate-900'>{user?.name || '—'}</div>
          </div>
          <div>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Email</div>
            <div className='mt-1'>{user?.email || '—'}</div>
          </div>
          <div>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Phone</div>
            <div className='mt-1'>{user?.phoneNo || '—'}</div>
          </div>
          <div>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>ABN</div>
            <div className='mt-1'>{user?.ABN || '—'}</div>
          </div>
        </div>
        <div className='mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-500'>
          Hedgetech Marketplace syncs seller credentials and compliance checks automatically once platform integrations are enabled.
        </div>
      </section>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className='inline-flex items-center gap-1 rounded-full bg-emerald-600/15 px-3 py-1 text-xs font-semibold text-emerald-800'>{children}</span>
}

export const Route = createFileRoute('/marketplace/_layout/merchant/$id/')({
  component: MerchantPage,
})
