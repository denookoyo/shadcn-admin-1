import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, ShieldCheck, Truck } from 'lucide-react'
import { imageFor } from '@/features/marketplace/helpers'
import { db, type CartItem, type Product } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { SafeImg } from '@/components/safe-img'

function CartPage() {
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || user?.accountNo || 'guest'
  const [cart, setCart] = useState<CartItem[]>([])
  const [productsById, setProductsById] = useState<Record<string, Product>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const items = await db.getCart(ns)
      const prods = await db.listProducts()
      if (!mounted) return
      setCart(items)
      setProductsById(Object.fromEntries(prods.map((p) => [p.id, p])))
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [ns])

  const detailed = useMemo(
    () =>
      cart
        .map((c) => ({
          cartId: c.id,
          quantity: c.quantity,
          meta: c.meta,
          product: productsById[c.productId],
        }))
        .filter((entry) => entry.product),
    [cart, productsById]
  )

  const subtotal = detailed.reduce((acc, entry) => acc + entry.product.price * entry.quantity, 0)

  return (
    <div className='mx-auto max-w-6xl space-y-8 px-4 py-10'>
      <header className='rounded-3xl border border-emerald-100/60 bg-emerald-50/60 p-6 shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <span className='inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
              Step 1 • Review cart
            </span>
            <h1 className='mt-3 text-2xl font-semibold text-slate-900'>Your Hedgetech cart</h1>
            <p className='mt-2 max-w-xl text-sm text-slate-600'>Confirm items, schedule services, and move to a secure checkout powered by Hedgetech buyer protection.</p>
          </div>
          <div className='flex items-center gap-3 rounded-2xl border border-white bg-white/80 px-4 py-3 text-xs text-slate-600 shadow-sm'>
            <ClipboardList className='h-4 w-4 text-emerald-600' />
            <div>
              <div className='font-semibold text-slate-800'>3-step checkout</div>
              <div>Cart → Details → Confirmation</div>
            </div>
          </div>
        </div>
      </header>

      <div className='grid gap-6 lg:grid-cols-[1.6fr_1fr]'>
        <section className='space-y-4'>
          {loading ? (
            <div className='rounded-3xl border border-slate-200 p-10 text-center text-sm text-slate-500'>Loading your cart…</div>
          ) : detailed.length === 0 ? (
            <div className='rounded-3xl border border-dashed border-slate-200 p-16 text-center text-sm text-slate-500'>
              Your cart is empty. Browse the marketplace to add goods and services to your next order.
              <div className='mt-4'>
                <Link to='/marketplace/listings' className='rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500'>
                  Explore listings
                </Link>
              </div>
            </div>
          ) : (
            detailed.map((entry) => {
              const isService = entry.product.type === 'service'
              let appointmentLabel: string | null = null
              if (isService && entry.meta) {
                const dt = new Date(entry.meta)
                appointmentLabel = Number.isNaN(dt.getTime()) ? entry.meta : dt.toLocaleString()
              }
              return (
                <div key={entry.cartId} className='flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center'>
                  <SafeImg
                    src={entry.product.img || imageFor(entry.product.title, 200, 200)}
                    alt={entry.product.title}
                    className='h-24 w-24 rounded-2xl object-cover'
                    loading='lazy'
                  />
                  <div className='flex-1 space-y-1'>
                    <div className='text-sm font-semibold text-slate-900'>{entry.product.title}</div>
                    <div className='text-xs text-slate-500'>
                      Qty: {entry.quantity}
                      {appointmentLabel ? ` • ${appointmentLabel}` : ''}
                    </div>
                    <div className='text-xs text-slate-500'>Seller: {(entry.product as any).ownerName || entry.product.seller}</div>
                    <div className='text-xs text-emerald-700'>★ {Number((entry.product as any).ownerRating ?? entry.product.rating ?? 4.7).toFixed(1)}</div>
                  </div>
                  <div className='flex flex-col items-end gap-3 text-sm'>
                    <div className='text-right text-lg font-semibold text-emerald-700'>A${(entry.product.price * entry.quantity).toFixed(2)}</div>
                    <button
                      className='rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-500 transition hover:border-emerald-200 hover:text-emerald-700'
                      onClick={async () => {
                        await db.removeFromCart(entry.cartId, ns)
                        setCart((items) => items.filter((c) => c.id !== entry.cartId))
                        window.dispatchEvent(new CustomEvent('cart:changed'))
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </section>

        <aside className='space-y-4'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='text-lg font-semibold text-slate-900'>Order summary</div>
            <div className='mt-4 space-y-2 text-sm text-slate-600'>
              <div className='flex justify-between'>
                <span>Subtotal</span>
                <span>A${subtotal.toFixed(2)}</span>
              </div>
              <div className='flex justify-between'>
                <span>Platform fee</span>
                <span>Included</span>
              </div>
              <div className='flex justify-between'>
                <span>Shipping</span>
                <span>Free</span>
              </div>
            </div>
            <div className='mt-4 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700'>
              <span>Total</span>
              <span>A${subtotal.toFixed(2)}</span>
            </div>
            <Link
              to='/marketplace/checkout'
              className='mt-5 block w-full rounded-full bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500'
            >
              Proceed to checkout
            </Link>
            <Link to='/marketplace/listings' className='mt-3 block text-center text-xs font-semibold text-emerald-700 hover:underline'>Continue shopping</Link>
          </div>

          <div className='grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-600'>
            <div className='flex items-center gap-3'>
              <ShieldCheck className='h-4 w-4 text-emerald-600' />
              Hedgetech buyer protection covers every order up to A$25k.
            </div>
            <div className='flex items-center gap-3'>
              <Truck className='h-4 w-4 text-emerald-600' />
              Track shipping and on-site services from the Hedgetech dashboard.
            </div>
            <div className='flex items-center gap-3'>
              <ClipboardList className='h-4 w-4 text-emerald-600' />
              Attach purchase orders or instructions at checkout for complex fulfilment.
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/cart/')({
  component: CartPage,
})
