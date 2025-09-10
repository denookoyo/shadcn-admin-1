import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
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

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between text-sm"><span className="text-gray-500">{label}</span><span className="font-medium">{value ?? '—'}</span></div>
  )
}

function Histogram({ histogram, count }: { histogram: Record<number, number>; count: number }) {
  return (
    <div className="space-y-1">
      {[5,4,3,2,1].map((star) => {
        const c = histogram?.[star as 1|2|3|4|5] || 0
        const pct = count ? Math.round((c / count) * 100) : 0
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-10 text-right">{star}★</span>
            <div className="h-2 flex-1 rounded bg-gray-200">
              <div className="h-2 rounded bg-amber-400" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 text-right">{c}</span>
          </div>
        )
      })}
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
        const [u, r] = await Promise.all([
          db.getUserById?.(sellerId) ?? Promise.resolve(null),
          db.listSellerReviews?.(sellerId) ?? Promise.resolve(null as any),
        ])
        if (!mounted) return
        setUser(u)
        setReviews(r)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [sellerId])

  const avgText = useMemo(() => (reviews?.avg ? reviews.avg.toFixed(1) : '—'), [reviews?.avg])

  if (!Number.isFinite(sellerId)) return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-red-600">Invalid seller id</div>
  if (loading) return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-gray-500">Loading merchant…</div>
  if (!user) return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-gray-500">Merchant not found.</div>

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Merchant')
  const avatar = user?.image || imageFor(displayName, 200, 200)
  const rating = (user as any)?.rating ?? reviews?.avg ?? 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-4">
        <img src={avatar} alt={displayName} className="h-20 w-20 rounded-full object-cover" />
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <div className="text-sm text-gray-600">★ {Number(rating).toFixed(1)} • {reviews?.count ?? 0} review{(reviews?.count ?? 0) === 1 ? '' : 's'}</div>
          <div className="text-xs text-gray-500">ID: {sellerId}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border p-4 md:col-span-2">
          <div className="mb-3 flex items-end gap-3">
            <div className="text-3xl font-bold">{avgText}</div>
            <div className="text-sm text-gray-600">Average rating</div>
          </div>
          <Histogram histogram={reviews?.histogram || { 1:0,2:0,3:0,4:0,5:0 }} count={reviews?.count || 0} />
          <div className="mt-4 max-h-96 space-y-3 overflow-auto pr-2">
            {reviews?.reviews?.length ? (
              reviews.reviews.map((r) => (
                <div key={r.orderId} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      {r.buyer?.image ? <img src={r.buyer.image} className="h-5 w-5 rounded-full object-cover" /> : null}
                      <span>{r.buyer?.name || r.buyer?.email || `Buyer #${r.buyer?.id ?? ''}`}</span>
                    </div>
                    <div>{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-sm font-medium">{Array.from({ length: r.rating }).map(() => '★').join('')}<span className="ml-2 font-normal text-gray-700">{r.feedback}</span></div>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-gray-500">No reviews yet.</div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border p-4">
          <h2 className="mb-2 font-semibold">Merchant details</h2>
          <div className="space-y-2">
            <Row label="Name" value={user?.name || '—'} />
            <Row label="Email" value={user?.email || '—'} />
            <Row label="Phone" value={user?.phoneNo || '—'} />
            <Row label="ABN" value={user?.ABN || '—'} />
            <Row label="Location" value={(user as any)?.location || 'Not specified'} />
            <Row label="Member since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'} />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <Link to="/marketplace/listings" search={{ q: user?.name || undefined }} className="underline">View listings</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/merchant/$id/')({
  component: MerchantPage,
})
