import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { imageFor } from '@/features/marketplace/helpers'
import { db, type Product } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { SafeImg } from '@/components/safe-img'

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">{children}</span>
}

function ListingDetail() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const { slug } = useParams({ from: '/marketplace/_layout/listing/$slug/' })
  const [product, setProduct] = useState<Product | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [ownerImage, setOwnerImage] = useState<string | null>(null)
  const [ownerRating, setOwnerRating] = useState<number>(5)
  const [qty, setQty] = useState(1)
  // Reviews modal (unused now that we link to merchant page)
  // const [showReviews, setShowReviews] = useState(false)
  // const [reviewsLoading, setReviewsLoading] = useState(false)
  // const [reviewsData, setReviewsData] = useState<{ avg: number; count: number; histogram: Record<number, number>; reviews: { orderId: string; rating: number; feedback: string; createdAt: string; buyer?: { id: number; name?: string | null; email: string; image?: string | null } }[] } | null>(null)

  const images = useMemo(() => {
    if (!product) return [] as string[]
    const extra = ((product as any).images as string[] | undefined)?.filter(Boolean) || []
    const base = [product.img, ...extra]
    if (base.length >= 4) return base.slice(0, 4)
    const needed = 4 - base.length
    const pads = Array.from({ length: needed }, (_, i) => imageFor(`${product.title} ${i + 1}`, 600, 400))
    return [...base, ...pads]
  }, [product])

  const bullets = useMemo(
    () => [
      'High quality and reliable performance',
      'Fast shipping and easy returns',
      'Secure checkout with buyer protection',
    ],
    []
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const prod = await db.getProductBySlug(slug)
      if (mounted) { setProduct(prod ?? null); setLoaded(true) }
    })()
    return () => {
      mounted = false
    }
  }, [slug])

  // Resolve owner name using ownerId when available
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const raw = (product as any)?.ownerId
        const id = Number(raw)
        if (!Number.isFinite(id)) { if (mounted) setOwnerName(null); return }
        const user = await db.getUserById?.(id)
        if (!mounted) return
        if (user) {
          setOwnerName(user.name || (user.email?.split('@')[0] ?? null))
          setOwnerImage(user.image || null)
          if ((user as any).rating != null) setOwnerRating((user as any).rating)
        }
      } catch {
        if (mounted) setOwnerName(null)
      }
    })()
    return () => { mounted = false }
  }, [product])

  // Display ownerId (seller's id)
  const ownerIdLabel = product?.ownerId ?? 'N/A'

  // async function openReviews() { /* no-op */ }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {!loaded ? (
        <div className="p-6 text-sm text-gray-500">Loading product…</div>
      ) : !product ? (
        <div className="p-6 text-sm text-gray-500">Product not found.</div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
            <SafeImg src={images[0]} alt={product.title} className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {images.slice(1).map((src, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                <SafeImg src={src} alt={`${product.title} ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{product.title}</h1>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span className="inline-flex items-center gap-2">
              {ownerImage ? (
                <Link to="/marketplace/merchant/$id" params={{ id: String((product as any)?.ownerId ?? '') }}>
                  <img src={ownerImage} alt={ownerName || 'Seller'} className="h-4 w-4 rounded-full object-cover" />
                </Link>
              ) : null}
              <span>
                by <Link to="/marketplace/merchant/$id" params={{ id: String((product as any)?.ownerId ?? '') }} className="font-medium underline">{ownerName || ownerIdLabel}</Link>
              </span>
            </span>
            <Link to="/marketplace/merchant/$id" params={{ id: String((product as any)?.ownerId ?? '') }} className="underline underline-offset-2 hover:text-gray-900">
              ★ {Number(ownerRating ?? 5).toFixed(1)} • See reviews
            </Link>
            <span>• <span className="text-green-700">Verified</span></span>
          </div>
          <div className="text-3xl font-extrabold">A${product.price}</div>

          <div className="flex flex-wrap gap-2">
            <Pill>Free shipping</Pill>
            <Pill>30-day returns</Pill>
            <Pill>2-year warranty</Pill>
          </div>

          {product.type === 'service' ? (
            <div>
              <label className="text-sm font-medium">Preferred time</label>
              <div className="mt-2 flex items-center gap-2">
                <input id="appt" type="datetime-local" className="rounded-xl border px-3 py-2 text-sm" onChange={(e) => (window as any).__appt = e.target.value} />
                <span className="text-xs text-gray-500">Seller will confirm</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="mt-2 flex gap-2">
                {['Black','Silver','Blue'].map((c) => (
                  <button key={c} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">{c}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Quantity</label>
            <div className="mt-2 inline-flex overflow-hidden rounded-xl border">
              <button className="px-3 py-1" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
              <input value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="w-12 border-l border-r text-center" />
              <button className="px-3 py-1" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl bg-black px-4 py-3 text-white"
              onClick={async () => {
                const meta = product.type === 'service' ? (window as any).__appt || '' : undefined
                await db.addToCart(product.id, qty, ns as any, meta)
                window.dispatchEvent(new CustomEvent('cart:changed'))
              }}
            >
              Add to cart
            </button>
            <Link to="/marketplace/checkout" className="flex-1 rounded-xl border px-4 py-3 text-center">Buy now</Link>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">About this item</h3>
            {((product as any).description) ? (
              <div className='prose prose-sm max-w-none text-gray-700'>
                {String((product as any).description).split(/\n\n+/).map((p: string, i: number) => (<p key={i}>{p}</p>))}
              </div>
            ) : (
              <ul className="list-inside list-disc text-sm text-gray-700">
                {bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Reviews modal removed in favor of dedicated merchant page */}
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/listing/$slug/')({
  component: ListingDetail,
})
