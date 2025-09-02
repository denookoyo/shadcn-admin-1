import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { imageFor } from '@/features/marketplace/helpers'
import { SafeImg } from '@/components/safe-img'
import { db, type Category, type Product } from '@/lib/data'

function CategoryCard({ name }: { name: string }) {
  return (
    <Link to="/marketplace/listings" search={{ q: name }} className="group overflow-hidden rounded-2xl border">
      <div className="h-28 w-full overflow-hidden">
        <SafeImg src={imageFor(name, 600, 300)} alt={name}
                 className="h-full w-full object-cover transition group-hover:scale-105" />
      </div>
      <div className="p-3">
        <div className="font-medium">{name}</div>
        <div className="text-xs text-gray-500">Explore {name}</div>
      </div>
    </Link>
  )
}

function MarketplaceHome() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [cats, prods] = await Promise.all([
          db.listCategories?.() ?? Promise.resolve([] as Category[]),
          db.listProducts(),
        ])
        if (!mounted) return
        setCategories(cats)
        setProducts(prods)
      } catch {
        if (!mounted) return
        setCategories([])
        setProducts([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-tr from-gray-100 to-gray-200 px-6 py-14 md:px-12 md:py-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
            A beautiful marketplace for <span className="underline decoration-8">goods</span> & <span className="underline decoration-8">services</span>.
          </h1>
          <p className="mt-3 text-gray-600">
            Realistic visuals powered by live Unsplash images. Add your data/API when ready.
          </p>
          <div className="mt-4 flex max-w-lg overflow-hidden rounded-xl border bg-white p-1">
            <input placeholder="Search products & services" className="w-full px-3 py-2 outline-none" />
            <Link to="/marketplace/listings" className="rounded-lg bg-black px-4 py-2 text-white">Search</Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
            <Link to="/marketplace/listings" search={{ q: 'headphones' }} className="rounded-full bg-white/70 px-3 py-1 border">Headphones</Link>
            <Link to="/marketplace/listings" search={{ q: 'cleaning' }} className="rounded-full bg-white/70 px-3 py-1 border">Cleaning</Link>
            <Link to="/marketplace/listings" search={{ q: 'photography' }} className="rounded-full bg-white/70 px-3 py-1 border">Photography</Link>
          </div>
        </div>
      </section>

      <section className="py-8">
        <h2 className="mb-4 text-xl font-semibold">Popular categories</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {categories.length === 0 && (
            <div className="col-span-6 text-sm text-gray-500">No categories yet.</div>
          )}
          {categories.map((c) => (<CategoryCard key={c.id} name={c.name} />))}
        </div>
      </section>

      <section className="py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Featured now</h2>
          <Link to="/marketplace/listings" className="text-sm underline">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {(products.slice(0, 4)).map((f, i) => (
            <div key={i} className="group overflow-hidden rounded-2xl border hover:shadow-lg">
              <div className="relative aspect-square w-full overflow-hidden">
                <SafeImg src={f.img} alt={f.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs">{f.type === 'service' ? 'Service' : 'Goods'}</span>
              </div>
              <div className="p-3">
                <div className="text-sm font-medium">{f.title}</div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  {((f as any).ownerId != null) ? (
                    <Link to="/marketplace/merchant/$id" params={{ id: String((f as any).ownerId) }} className="inline-flex items-center gap-2">
                      {(f as any).ownerImage ? (
                        <img src={(f as any).ownerImage} alt={(f as any).ownerName || f.seller}
                          className="h-4 w-4 rounded-full object-cover" />
                      ) : null}
                      <span>by {(f as any).ownerName || f.seller}</span>
                    </Link>
                  ) : (
                    <span>by {(f as any).ownerName || f.seller}</span>
                  )}
                </div>
                {((f as any).ownerId != null) ? (
                  <Link to="/marketplace/merchant/$id" params={{ id: String((f as any).ownerId) }} className="text-xs text-amber-600 underline">★ {Number((f as any).ownerRating ?? f.rating ?? 5).toFixed(1)}</Link>
                ) : (
                  <div className="text-xs text-amber-600">★ {Number((f as any).ownerRating ?? f.rating ?? 5).toFixed(1)}</div>
                )}
                <div className="mt-1 text-lg font-semibold">A${f.price}</div>
                <div className="text-xs text-amber-600">★ {(f.rating ?? 4.6).toFixed(1)}</div>
                <Link to="/marketplace/listing/$slug" params={{ slug: f.slug }} className="mt-2 block w-full rounded-xl border px-3 py-2 text-center text-sm hover:bg-gray-50">View</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export const Route = createFileRoute('/marketplace/_layout/')({
  component: MarketplaceHome,
})
