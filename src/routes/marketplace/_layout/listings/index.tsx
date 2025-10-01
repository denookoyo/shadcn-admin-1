import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Store, ShoppingCart, Filter, SlidersHorizontal } from 'lucide-react'
import { imageFor } from '@/features/marketplace/helpers'
import { db, type Product } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'

export type ListingsSearch = { q?: string }

type TypeFilter = 'all' | 'goods' | 'service'

function Segmented({ active, onChange }: { active: TypeFilter; onChange: (value: TypeFilter) => void }) {
  const options: Array<{ value: TypeFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'goods', label: 'Goods' },
    { value: 'service', label: 'Services' },
  ]

  return (
    <div className='inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs font-medium text-slate-600 shadow-sm'>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1 transition ${
            active === opt.value
              ? 'bg-emerald-600 text-white shadow'
              : 'hover:bg-slate-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Listings() {
  const search = useSearch({ from: '/marketplace/_layout/listings/' }) as ListingsSearch
  const q = (search?.q ?? '').toLowerCase()

  const [products, setProducts] = useState<Product[]>([])
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || (user as any)?.accountNo || 'guest'
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const prods = await db.listProducts()
        if (!mounted) return
        setProducts(prods)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const items = useMemo(() => {
    const base = products
    return base
      .filter((p) => (typeFilter === 'all' ? true : p.type === typeFilter))
      .filter((p) =>
        q
          ? p.title.toLowerCase().includes(q) ||
            p.seller.toLowerCase().includes(q) ||
            (p as any).ownerName?.toLowerCase?.().includes(q)
          : true
      )
  }, [products, q, typeFilter])

  const goodsCount = useMemo(() => products.filter((p) => p.type === 'goods').length, [products])
  const serviceCount = products.length - goodsCount

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      <header className='rounded-3xl border border-emerald-100/60 bg-emerald-50/60 p-6 shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <span className='inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
              Browse Hedgetech marketplace
            </span>
            <h1 className='mt-3 text-2xl font-semibold text-slate-900'>Find verified sellers across goods & services</h1>
            <p className='mt-2 max-w-2xl text-sm text-slate-600'>Use Hedgetech’s filters to surface trusted partners, instant book services, and high-performing products ready to fulfil.</p>
          </div>
          <div className='flex flex-col items-end gap-2 text-xs text-emerald-700'>
            <div>{products.length} live listings</div>
            <div>
              <span className='font-semibold'>{goodsCount}</span> goods • <span className='font-semibold'>{serviceCount}</span> services
            </div>
          </div>
        </div>
        <div className='mt-4 flex flex-wrap items-center gap-2'>
          <Segmented active={typeFilter} onChange={setTypeFilter} />
          <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-700'>
            <Filter className='h-3.5 w-3.5' />
            Smart filters applied
          </div>
        </div>
      </header>

      <div className='mt-6 flex flex-col gap-6 lg:flex-row'>
        <aside className='w-full flex-shrink-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:w-64'>
          <div className='flex items-center justify-between text-xs font-semibold text-slate-500'>
            <span>Refine results</span>
            <button className='text-emerald-600 hover:underline' onClick={() => { setTypeFilter('all') }}>
              Reset
            </button>
          </div>
          <div className='mt-4 space-y-5 text-sm text-slate-600'>
            <div>
              <div className='font-semibold text-slate-800'>Listing type</div>
              <div className='mt-2 space-y-2 text-xs'>
                <label className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    className='rounded border-slate-300 text-emerald-600 focus:ring-emerald-500'
                    checked={typeFilter !== 'service'}
                    onChange={() => setTypeFilter(typeFilter === 'goods' ? 'all' : 'goods')}
                  />
                  Goods
                </label>
                <label className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    className='rounded border-slate-300 text-emerald-600 focus:ring-emerald-500'
                    checked={typeFilter !== 'goods'}
                    onChange={() => setTypeFilter(typeFilter === 'service' ? 'all' : 'service')}
                  />
                  Services
                </label>
              </div>
            </div>
            <div>
              <div className='font-semibold text-slate-800'>Price range</div>
              <div className='mt-2 grid grid-cols-2 gap-2 text-xs'>
                <input placeholder='Min' className='rounded-full border border-slate-200 px-3 py-2' />
                <input placeholder='Max' className='rounded-full border border-slate-200 px-3 py-2' />
              </div>
              <p className='mt-2 text-[11px] text-slate-400'>Dynamic filters sync once APIs connect.</p>
            </div>
            <div>
              <div className='font-semibold text-slate-800'>Seller rating</div>
              <div className='mt-2 flex flex-wrap gap-2 text-xs'>
                {[5, 4, 3].map((rating) => (
                  <button key={rating} className='rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'>
                    {rating}★ & up
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className='font-semibold text-slate-800'>Fulfilment</div>
              <div className='mt-2 flex flex-col gap-2 text-xs'>
                <button className='rounded-full border border-slate-200 px-3 py-1 text-left transition hover:border-emerald-200 hover:text-emerald-700'>Instant book</button>
                <button className='rounded-full border border-slate-200 px-3 py-1 text-left transition hover:border-emerald-200 hover:text-emerald-700'>Ships today</button>
              </div>
            </div>
          </div>
        </aside>

        <div className='flex-1'>
          <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <input
              placeholder='Search listings...'
              defaultValue={search?.q ?? ''}
              className='w-full rounded-full border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-400 sm:max-w-sm'
            />
            <div className='flex items-center gap-2 text-xs text-slate-500'>
              <span className='inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2'><SlidersHorizontal className='h-3.5 w-3.5' />Sort: Popular</span>
              <Link to='/marketplace/dashboard/import' className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100'>
                <Store className='h-3.5 w-3.5' />Become a seller
              </Link>
            </div>
          </div>

          {loading ? (
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className='h-72 animate-pulse rounded-3xl border border-slate-100 bg-slate-100/80' />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className='rounded-3xl border border-dashed border-slate-200 p-16 text-center text-sm text-slate-500'>
              No listings match your filters yet. Adjust filters or check back once new sellers onboard.
            </div>
          ) : (
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {items.map((it) => {
                const sellerName = (it as any).ownerName || it.seller
                const rating = Number((it as any).ownerRating ?? it.rating ?? 4.7).toFixed(1)
                const availabilityLabel = it.type === 'service'
                  ? ((it as any).serviceDailyCapacity ? `${(it as any).serviceDailyCapacity} slots/day` : 'Accepting bookings')
                  : Number.isFinite(Number((it as any).stockCount))
                    ? `${(it as any).stockCount} in stock`
                    : 'Available now'
                return (
                  <div key={it.slug} className='group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg'>
                    <div className='relative aspect-[4/3] w-full overflow-hidden'>
                      <img
                        src={it.img || imageFor(it.title, 640, 640)}
                        alt={it.title}
                        loading='lazy'
                        className='h-full w-full object-cover transition duration-500 group-hover:scale-110'
                      />
                      <span className='absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-emerald-700'>
                        {it.type === 'service' ? 'Service' : 'Goods'}
                      </span>
                    </div>
                    <div className='flex flex-1 flex-col gap-3 p-4'>
                      <div className='flex items-start justify-between gap-2'>
                        <div>
                          <div className='text-sm font-semibold text-slate-900'>{it.title}</div>
                          <div className='text-xs text-slate-500'>by {sellerName}</div>
                        </div>
                        <div className='rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>A${it.price}</div>
                      </div>
                      <div className='flex items-center justify-between text-xs text-emerald-700'>
                        <span>★ {rating}</span>
                        <span className='rounded-full bg-slate-100 px-2 py-1 text-slate-500'>{availabilityLabel}</span>
                      </div>
                      <div className='mt-auto flex gap-2 text-sm'>
                        <button
                          className='inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 font-medium text-emerald-700 transition hover:bg-emerald-100'
                          onClick={async () => {
                            await db.addToCart(it.id, 1, ns as any)
                            window.dispatchEvent(new CustomEvent('cart:changed'))
                          }}
                        >
                          <ShoppingCart className='h-4 w-4' />Add to cart
                        </button>
                        <Link
                          to='/marketplace/listing/$slug'
                          params={{ slug: it.slug }}
                          className='inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-3 py-2 font-medium text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700'
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/listings/')({
  component: Listings,
})
