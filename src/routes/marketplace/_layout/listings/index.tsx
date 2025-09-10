import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { imageFor } from '@/features/marketplace/helpers'
import { db, type Product } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'

// No dummy catalog; use database only

export type ListingsSearch = { q?: string }

function Filters() {
  return (
    <aside className="hidden w-64 flex-shrink-0 rounded-2xl border p-4 md:block">
      <div className="mb-4">
        <h4 className="font-semibold">Type</h4>
        <div className="mt-2 space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" /> Goods</label>
          <label className="flex items-center gap-2"><input type="checkbox" /> Services</label>
        </div>
      </div>
      <div className="mb-4">
        <h4 className="font-semibold">Price</h4>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input placeholder="Min" className="rounded-xl border px-2 py-1 text-sm" />
          <input placeholder="Max" className="rounded-xl border px-2 py-1 text-sm" />
        </div>
      </div>
      <div className="mb-4">
        <h4 className="font-semibold">Category (query)</h4>
        <input placeholder="e.g. headphones" className="mt-2 w-full rounded-xl border px-2 py-2 text-sm" />
      </div>
      <button className="w-full rounded-xl bg-black px-3 py-2 text-sm text-white">Apply filters</button>
    </aside>
  )
}

function Listings() {
  const search = useSearch({ from: '/marketplace/_layout/listings/' }) as ListingsSearch
  const q = (search?.q ?? '').toLowerCase()

  const [products, setProducts] = useState<Product[]>([])
  const { user } = useAuthStore((s) => s.auth)
  const ns = user?.email || (user as any)?.accountNo || 'guest'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
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
    if (!q) return base
    return base.filter((p) =>
      p.title.toLowerCase().includes(q) || p.seller.toLowerCase().includes(q)
    )
  }, [products, q])

  return (
    <div className="mx-auto max-w-7xl gap-6 px-4 py-8 md:flex">
      <Filters />
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <input
            placeholder="Search listings..."
            defaultValue={search?.q ?? ''}
            className="w-1/2 rounded-xl border px-3 py-2"
          />
          <select className="rounded-xl border px-3 py-2 text-sm">
            <option>Sort: Popular</option>
            <option>Price: Low → High</option>
            <option>Price: High → Low</option>
            <option>Newest</option>
          </select>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading listings…</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.slug} className="group overflow-hidden rounded-2xl border hover:shadow-lg">
              <div className="relative aspect-square w-full overflow-hidden">
                <img src={it.img || imageFor(it.title, 640, 640)} alt={it.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs">{it.type === 'service' ? 'Service' : 'Goods'}</span>
              </div>
              <div className="p-3">
                <div className="text-sm font-medium">{it.title}</div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  {((it as any).ownerId != null) ? (
                    <Link to="/marketplace/merchant/$id" params={{ id: String((it as any).ownerId) }} className="inline-flex items-center gap-2">
                      {(it as any).ownerImage ? (
                        <img src={(it as any).ownerImage} alt={(it as any).ownerName || it.seller}
                          className="h-4 w-4 rounded-full object-cover" />
                      ) : null}
                      <span>by {(it as any).ownerName || it.seller}</span>
                    </Link>
                  ) : (
                    <span>by {(it as any).ownerName || it.seller}</span>
                  )}
                  {((it as any).ownerId != null) ? (
                    <Link to="/marketplace/merchant/$id" params={{ id: String((it as any).ownerId) }} className="underline">• ★ {Number((it as any).ownerRating ?? it.rating ?? 5).toFixed(1)}</Link>
                  ) : (
                    <span>• ★ {Number((it as any).ownerRating ?? it.rating ?? 5).toFixed(1)}</span>
                  )}
                </div>
                <div className="mt-1 text-lg font-semibold">A${it.price}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    className="flex-1 rounded-xl border px-3 py-2 text-sm"
                    onClick={async () => {
                      await db.addToCart(it.id, 1, ns as any)
                      // notify navbar to refresh cart count
                      window.dispatchEvent(new CustomEvent('cart:changed'))
                    }}
                  >
                    Add
                  </button>
                  <Link to="/marketplace/listing/$slug" params={{ slug: it.slug }}
                        className="flex-1 rounded-xl bg-black px-3 py-2 text-center text-sm text-white">
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/listings/')({
  component: Listings,
})
