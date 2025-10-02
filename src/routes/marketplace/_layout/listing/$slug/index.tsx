import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Truck, Clock3, MessageCircle } from 'lucide-react'
import { imageFor } from '@/features/marketplace/helpers'
import { db, type Product } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { SafeImg } from '@/components/safe-img'
import { ServiceScheduler } from '@/features/marketplace/service-scheduler'
import { ChatLauncher } from '@/features/assistant/chat-launcher'

function Badge({ children }: { children: React.ReactNode }) {
  return <span className='rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>{children}</span>
}

export const Route = createFileRoute('/marketplace/_layout/listing/$slug/')({
  component: ListingDetail,
})

function ListingDetail() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const { slug } = useParams({ from: '/marketplace/_layout/listing/$slug/' })
  const [product, setProduct] = useState<Product | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [ownerImage, setOwnerImage] = useState<string | null>(null)
  const [ownerRating, setOwnerRating] = useState<number>(4.9)
  const [qty, setQty] = useState(1)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [slotError, setSlotError] = useState<string | null>(null)

  const images = useMemo(() => {
    if (!product) return [] as string[]
    const extra = ((product as any).images as string[] | undefined)?.filter(Boolean) || []
    const base = [product.img, ...extra]
    if (base.length >= 4) return base.slice(0, 4)
    const needed = 4 - base.length
    const pads = Array.from({ length: needed }, (_, i) => imageFor(`${product.title} ${i + 1}`, 600, 400))
    return [...base, ...pads]
  }, [product])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const prod = await db.getProductBySlug(slug)
      if (mounted) {
        setProduct(prod ?? null)
        setLoaded(true)
      }
    })()
    return () => {
      mounted = false
    }
  }, [slug])

  useEffect(() => {
    setSelectedSlot(null)
    setSlotError(null)
  }, [product?.id])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const raw = (product as any)?.ownerId
        const id = Number(raw)
        if (!Number.isFinite(id)) {
          if (mounted) setOwnerName((product as any)?.seller ?? null)
          return
        }
        const owner = await db.getUserById?.(id)
        if (!mounted) return
        if (owner) {
          setOwnerName(owner.name || owner.email?.split('@')[0] || 'Seller')
          setOwnerImage(owner.image || null)
          if ((owner as any).rating != null) setOwnerRating((owner as any).rating)
        }
      } catch {
        if (mounted) setOwnerName(null)
      }
    })()
    return () => {
      mounted = false
    }
  }, [product])

  const ownerIdLabel = product?.ownerId ?? 'N/A'

  const bullets = useMemo(
    () => [
      'Genuine item verified by Hedgetech operations.',
      'Flexible fulfilment windows and buyer-side support.',
      'Secure payments with instant refund if seller cancels.',
    ],
    []
  )

  if (!loaded) {
    return <div className='mx-auto max-w-6xl px-4 py-20 text-center text-sm text-slate-500'>Loading product…</div>
  }

  if (!product) {
    return <div className='mx-auto max-w-6xl px-4 py-20 text-center text-sm text-slate-500'>This listing is no longer available.</div>
  }

  const isService = product.type === 'service'
  const displayQuantity = isService ? 1 : qty

  return (
    <div className='mx-auto max-w-6xl px-4 py-10'>
      <div className='flex flex-wrap items-center gap-2 text-xs text-slate-500'>
        <Link to='/marketplace/listings' className='font-medium text-emerald-700 hover:underline'>Marketplace</Link>
        <span>/</span>
        <span>{product.title}</span>
      </div>

      <div className='mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]'>
        <div className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='md:col-span-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
              <SafeImg src={images[0]} alt={product.title} className='h-full w-full object-cover' loading='lazy' />
            </div>
            {images.slice(1).map((img, idx) => (
              <div key={idx} className='overflow-hidden rounded-3xl border border-slate-200'>
                <SafeImg src={img} alt={`${product.title} ${idx + 2}`} className='h-full w-full object-cover' loading='lazy' />
              </div>
            ))}
          </div>

          <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Overview</h2>
            {((product as any).description) ? (
              <div className='prose prose-sm mt-3 max-w-none text-slate-600'>
                {String((product as any).description)
                  .split(/\n\n+/)
                  .map((paragraph: string, index: number) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
            ) : (
              <ul className='mt-3 grid list-inside list-disc gap-2 text-sm text-slate-600 md:grid-cols-2'>
                {bullets.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>

          <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Fulfilment & support</h2>
            <div className='mt-4 grid gap-4 md:grid-cols-3'>
              <div className='rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800'>
                <ShieldCheck className='mb-2 h-5 w-5' />
                Hedgetech buyer protection covers every order with automatic refunds for cancellations or no-shows.
              </div>
              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700'>
                <Truck className='mb-2 h-5 w-5 text-emerald-600' />
                Preferred shipping & service partners confirm handover or appointment windows with live updates.
              </div>
              <div className='rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700'>
                <Clock3 className='mb-2 h-5 w-5 text-emerald-600' />
                Typical fulfilment within 48h for goods, 24h confirmation for services.
              </div>
            </div>
          </section>
        </div>

        <aside className='space-y-6'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='flex items-center justify-between gap-2'>
              <Badge>{isService ? 'Service' : 'Product'}</Badge>
              <span className='text-xs font-medium text-slate-500'>ID {product.id.slice(0, 6)}</span>
            </div>
            <h1 className='mt-4 text-2xl font-semibold text-slate-900'>{product.title}</h1>
            <div className='mt-3 flex items-center gap-2 text-sm text-slate-500'>
              <span className='inline-flex items-center gap-2'>
                {ownerImage ? (
                  <Link to='/marketplace/merchant/$id' params={{ id: String((product as any)?.ownerId ?? '') }}>
                    <img src={ownerImage} alt={ownerName || 'Seller'} className='h-6 w-6 rounded-full object-cover' />
                  </Link>
                ) : null}
                <span>
                  Sold by{' '}
                  <Link
                    to='/marketplace/merchant/$id'
                    params={{ id: String((product as any)?.ownerId ?? '') }}
                    className='font-semibold text-emerald-700 hover:underline'
                  >
                    {ownerName || ownerIdLabel}
                  </Link>
                </span>
              </span>
              <span>•</span>
              <span className='text-emerald-700'>★ {Number(ownerRating ?? 4.9).toFixed(1)}</span>
            </div>
            <div className='mt-4 text-3xl font-bold text-emerald-700'>A${product.price}</div>

            <div className='mt-5 space-y-4 text-sm text-slate-600'>
              {isService ? (
                <div className='space-y-3'>
                  <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Book an appointment</div>
                  <ServiceScheduler
                    productId={product.id}
                    value={selectedSlot}
                    onChange={(slot) => {
                      setSelectedSlot(slot)
                      setSlotError(null)
                    }}
                  />
                  <p className='text-xs text-slate-500'>Providers confirm bookings within 24 hours. You can reschedule later if needed.</p>
                  {slotError ? (
                    <div className='rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600'>{slotError}</div>
                  ) : null}
                </div>
              ) : (
                <div>
                  <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Select quantity</label>
                  <div className='mt-2 inline-flex items-center rounded-full border border-slate-200 bg-slate-50'>
                    <button className='px-4 py-2 text-lg font-semibold' onClick={() => setQty((q) => Math.max(1, q - 1))}>
                      −
                    </button>
                    <input
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                      className='w-14 border-x border-slate-200 bg-white text-center text-sm outline-none'
                    />
                    <button className='px-4 py-2 text-lg font-semibold' onClick={() => setQty((q) => q + 1)}>
                      +
                    </button>
                  </div>
                </div>
              )}

              <div className='flex flex-col gap-3'>
                <button
                  className='inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500'
                  onClick={async () => {
                    const quantity = displayQuantity
                    const meta = isService ? selectedSlot : undefined
                    if (isService && !meta) {
                      setSlotError('Select an appointment time before adding to cart.')
                      return
                    }
                    await db.addToCart(product.id, quantity, ns as any, meta ?? undefined)
                    window.dispatchEvent(new CustomEvent('cart:changed'))
                  }}
                >
                  Add to cart • A${(product.price * displayQuantity).toFixed(2)}
                </button>
                <Link
                  to='/marketplace/checkout'
                  className='inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50'
                >
                  Buy now
                </Link>
                <Link
                  to='/marketplace/merchant/$id'
                  params={{ id: String((product as any)?.ownerId ?? '') }}
                  className='inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'
                >
                  <MessageCircle className='h-4 w-4' /> Message seller
                </Link>
              </div>
            </div>

            <div className='mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600'>
              <div className='flex items-center justify-between'>
                <span>Buyer coverage</span>
                <span className='font-semibold text-emerald-700'>Protected</span>
              </div>
              <p>
                Every Hedgetech transaction is protected by identity verification, escrow-backed payments, and responsive dispute resolution.
              </p>
            </div>
          </div>

          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-slate-900'>Seller signals</h2>
            <div className='mt-4 space-y-3 text-sm text-slate-600'>
              <div className='flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-800'>
                <span>Verified identity</span>
                <span className='font-semibold'>Yes</span>
              </div>
              <div className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
                <span>Average response time</span>
                <span>{(product as any).responseTime ?? 'Under 2h'}</span>
              </div>
              <div className='flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
                <span>Repeat buyers</span>
                <span className='font-semibold text-emerald-700'>{(product as any).repeatBuyerRate ?? '62%'}</span>
              </div>
              <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-500'>
                Seller dashboard metrics sync automatically when connected to Hedgetech APIs.
              </div>
            </div>
          </div>
        </aside>
      </div>
      <ChatLauncher className='bottom-6 right-6 sm:bottom-8 sm:right-8' />
    </div>
  )
}
